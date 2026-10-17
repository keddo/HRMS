import "dotenv/config";
import { PrismaClient, Role, Gender, EmploymentStatus, type Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

// keepAlive prevents Neon's pooler from silently dropping the connection during
// this script's many sequential round trips; a bare connectionString doesn't set it.
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
  keepAlive: true,
  keepAliveInitialDelayMillis: 5000,
});
const prisma = new PrismaClient({ adapter, transactionOptions: { maxWait: 10000, timeout: 60000 } });

const DEPARTMENTS: { name: string; positions: string[] }[] = [
  { name: "Executive", positions: ["Chief Executive Officer", "Chief Operating Officer"] },
  {
    name: "Engineering",
    positions: ["Software Engineer", "Senior Software Engineer", "Engineering Manager", "QA Engineer", "DevOps Engineer"],
  },
  {
    name: "Human Resources",
    positions: ["HR Generalist", "HR Manager", "Recruiter", "Payroll Specialist"],
  },
  { name: "Finance", positions: ["Accountant", "Finance Manager", "Financial Analyst"] },
  { name: "Sales", positions: ["Sales Representative", "Account Executive", "Sales Manager"] },
  { name: "Marketing", positions: ["Marketing Specialist", "Content Strategist", "Marketing Manager"] },
  { name: "Operations", positions: ["Operations Coordinator", "Operations Manager", "Facilities Officer"] },
  { name: "Customer Support", positions: ["Support Agent", "Support Team Lead"] },
];

const WORK_LOCATIONS = ["Head Office", "Bole Branch", "Piassa Branch", "Remote"];

const LEAVE_TYPES = [
  { name: "Annual Leave", defaultDaysPerYear: 20, isPaid: true },
  { name: "Sick Leave", defaultDaysPerYear: 10, isPaid: true },
  { name: "Maternity/Paternity Leave", defaultDaysPerYear: 60, isPaid: true },
  { name: "Unpaid Leave", defaultDaysPerYear: 0, isPaid: false },
];

const FIRST_NAMES = [
  "Abebe","Kebede","Mulugeta","Fatuma","Sara","Daniel","Ruth","Samuel","Helen","Yonas",
  "Hana","Tesfaye","Bethlehem","Dawit","Meron","Nathan","Liya","Eyob","Selam","Amanuel",
  "Rahel","Kidus","Tigist","Biruk","Hiwot","Mikias","Eden","Robel","Marta","Bereket",
  "John","Mary","James","Patricia","Michael","Linda","David","Barbara","Richard","Susan",
];
const LAST_NAMES = [
  "Tesfaye","Alemu","Bekele","Girma","Haile","Wolde","Tadesse","Assefa","Getachew","Desta",
  "Lemma","Mamo","Negash","Kassa","Abera","Worku","Fikre","Hagos","Teshome","Yimer",
  "Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez",
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDateBetween(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function main() {
  console.log("Seeding database...");

  const passwordHash = await bcrypt.hash("Password123!", 10);

  // Reset all app data so this script can be re-run idempotently. A single TRUNCATE
  // is one round trip and doesn't hold a transaction open across dozens of deletes,
  // which was timing out against a remote database (see git history for the longer
  // $transaction([...deleteMany]) version this replaced).
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "AuditLog", "PasswordResetToken", "LoginAttempt", "Notification",
      "Asset", "EmployeeChecklistItem", "EmployeeChecklist",
      "ChecklistTemplateItem", "ChecklistTemplate",
      "Interview", "Offer", "Application", "JobRequisition", "Candidate",
      "PerformanceReview", "ReviewCycle", "Goal",
      "PayslipLine", "Payslip", "PayrollRun",
      "EmployeeSalaryComponent", "EmployeeSalary", "PayComponent",
      "LeaveRequest", "LeaveBalance", "Attendance", "Document", "Announcement",
      "EmploymentHistory", "SalaryHistory",
      "User", "Employee", "Position", "Department", "WorkLocation", "LeaveType", "Holiday"
    CASCADE
  `);

  const payComponents = await Promise.all([
    prisma.payComponent.create({
      data: { name: "House Allowance", type: "EARNING", isPercentage: true, defaultValue: 20 },
    }),
    prisma.payComponent.create({
      data: { name: "Transport Allowance", type: "EARNING", isPercentage: false, defaultValue: 150 },
    }),
    prisma.payComponent.create({
      data: { name: "Income Tax", type: "DEDUCTION", isPercentage: true, defaultValue: 15 },
    }),
    prisma.payComponent.create({
      data: { name: "Pension Contribution", type: "DEDUCTION", isPercentage: true, defaultValue: 7 },
    }),
  ]);

  for (const lt of LEAVE_TYPES) {
    await prisma.leaveType.create({ data: lt });
  }

  // Departments and positions: IDs are generated client-side so both can be batched
  // into two createMany calls instead of ~35 sequential round trips.
  const departmentMap: Record<string, { id: string; positionIds: Record<string, string> }> = {};
  const departmentRows: { id: string; name: string }[] = [];
  const positionRows: { id: string; title: string; departmentId: string }[] = [];

  for (const dept of DEPARTMENTS) {
    const deptId = crypto.randomUUID();
    const positionIds: Record<string, string> = {};
    departmentRows.push({ id: deptId, name: dept.name });
    for (const title of dept.positions) {
      const posId = crypto.randomUUID();
      positionIds[title] = posId;
      positionRows.push({ id: posId, title, departmentId: deptId });
    }
    departmentMap[dept.name] = { id: deptId, positionIds };
  }
  await prisma.department.createMany({ data: departmentRows });
  await prisma.position.createMany({ data: positionRows });
  await prisma.workLocation.createMany({ data: WORK_LOCATIONS.map((name) => ({ name })) });

  const hireRangeStart = new Date("2016-01-01");
  const hireRangeEnd = new Date("2026-09-01");

  type SeedEmployee = { id: string; departmentName: string; isManager?: boolean };
  const allEmployees: SeedEmployee[] = [];
  const employeeRows: Prisma.EmployeeCreateManyInput[] = [];
  const departmentHeads: { departmentId: string; headId: string }[] = [];

  // 1. Executives (top of org chart, no manager)
  const exec = departmentMap["Executive"];
  const ceoId = crypto.randomUUID();
  employeeRows.push({
    id: ceoId,
    employeeCode: "EMP0001",
    firstName: "Alemayehu",
    lastName: "Tesfaye",
    email: "ceo@company.com",
    gender: Gender.MALE,
    hireDate: new Date("2016-01-15"),
    employmentStatus: EmploymentStatus.ACTIVE,
    departmentId: exec.id,
    positionId: exec.positionIds["Chief Executive Officer"],
  });
  allEmployees.push({ id: ceoId, departmentName: "Executive", isManager: true });

  const cooId = crypto.randomUUID();
  employeeRows.push({
    id: cooId,
    employeeCode: "EMP0002",
    firstName: "Sara",
    lastName: "Mulugeta",
    email: "coo@company.com",
    gender: Gender.FEMALE,
    hireDate: new Date("2016-03-01"),
    employmentStatus: EmploymentStatus.ACTIVE,
    departmentId: exec.id,
    positionId: exec.positionIds["Chief Operating Officer"],
    managerId: ceoId,
  });
  allEmployees.push({ id: cooId, departmentName: "Executive", isManager: true });
  departmentHeads.push({ departmentId: exec.id, headId: ceoId });

  let empCounter = 3;
  const TARGET_TOTAL = 200;
  const departmentsExclExec = DEPARTMENTS.filter((d) => d.name !== "Executive");
  const perDept = Math.floor((TARGET_TOTAL - 2) / departmentsExclExec.length);

  for (const dept of departmentsExclExec) {
    const { id: departmentId, positionIds } = departmentMap[dept.name];
    const managerTitle = dept.positions.find((p) => /manager|lead/i.test(p)) ?? dept.positions[0];

    const managerId = crypto.randomUUID();
    employeeRows.push({
      id: managerId,
      employeeCode: `EMP${String(empCounter++).padStart(4, "0")}`,
      firstName: randomFrom(FIRST_NAMES),
      lastName: randomFrom(LAST_NAMES),
      email: `${dept.name.toLowerCase().replace(/\s+/g, ".")}.manager@company.com`,
      gender: randomFrom([Gender.MALE, Gender.FEMALE]),
      hireDate: randomDateBetween(hireRangeStart, new Date("2020-01-01")),
      employmentStatus: EmploymentStatus.ACTIVE,
      departmentId,
      positionId: positionIds[managerTitle],
      managerId: cooId,
    });
    allEmployees.push({ id: managerId, departmentName: dept.name, isManager: true });
    departmentHeads.push({ departmentId, headId: managerId });

    for (let i = 0; i < perDept - 1; i++) {
      const title = randomFrom(dept.positions.filter((p) => p !== managerTitle));
      const firstName = randomFrom(FIRST_NAMES);
      const lastName = randomFrom(LAST_NAMES);
      const code = `EMP${String(empCounter).padStart(4, "0")}`;
      const empId = crypto.randomUUID();
      employeeRows.push({
        id: empId,
        employeeCode: code,
        firstName,
        lastName,
        email: `${firstName}.${lastName}.${empCounter}@company.com`.toLowerCase(),
        gender: randomFrom([Gender.MALE, Gender.FEMALE]),
        hireDate: randomDateBetween(hireRangeStart, hireRangeEnd),
        employmentStatus: EmploymentStatus.ACTIVE,
        departmentId,
        positionId: positionIds[title],
        managerId,
      });
      allEmployees.push({ id: empId, departmentName: dept.name });
      empCounter++;
    }
  }

  await prisma.employee.createMany({ data: employeeRows });
  await Promise.all(
    departmentHeads.map(({ departmentId, headId }) =>
      prisma.department.update({ where: { id: departmentId }, data: { headId } })
    )
  );

  console.log(`Created ${allEmployees.length} employees.`);

  // Leave balances for current year
  const leaveTypes = await prisma.leaveType.findMany();
  const year = new Date().getFullYear();
  const leaveBalanceRows = allEmployees.flatMap(({ id: employeeId }) =>
    leaveTypes.map((lt) => ({
      employeeId,
      leaveTypeId: lt.id,
      year,
      allocatedDays: lt.defaultDaysPerYear,
      usedDays: 0,
    }))
  );
  await prisma.leaveBalance.createMany({ data: leaveBalanceRows });

  // Salary structures. IDs are generated here (rather than left to the DB default)
  // so EmployeeSalaryComponent rows can be built in the same pass and both batched
  // into single createMany calls instead of ~1,000 sequential round trips.
  const salaryRows: { id: string; employeeId: string; basicSalary: number }[] = [];
  const componentRows: { employeeSalaryId: string; payComponentId: string; amount: number }[] = [];
  for (const emp of allEmployees) {
    const basicSalary =
      emp.departmentName === "Executive"
        ? 12000 + Math.random() * 4000
        : emp.isManager
          ? 5000 + Math.random() * 2000
          : 2500 + Math.random() * 2000;

    const salaryId = crypto.randomUUID();
    salaryRows.push({ id: salaryId, employeeId: emp.id, basicSalary: Math.round(basicSalary) });

    for (const pc of payComponents) {
      const amount = pc.isPercentage ? Math.round((basicSalary * pc.defaultValue) / 100) : pc.defaultValue;
      componentRows.push({ employeeSalaryId: salaryId, payComponentId: pc.id, amount });
    }
  }
  await prisma.employeeSalary.createMany({ data: salaryRows });
  await prisma.employeeSalaryComponent.createMany({ data: componentRows });
  console.log(`Created salary structures for ${allEmployees.length} employees.`);

  // Seed login users for key roles
  const superAdminEmp = { id: ceoId };
  const hrManagerEmp = allEmployees.find((e) => e.departmentName === "Human Resources");
  const deptManagerEmp = allEmployees.find((e) => e.departmentName === "Engineering");
  const regularEmp = allEmployees[allEmployees.length - 1];

  await prisma.user.create({
    data: {
      email: "admin@company.com",
      passwordHash,
      role: Role.SUPER_ADMIN,
      employeeId: superAdminEmp.id,
    },
  });

  if (hrManagerEmp) {
    const hrEmpFull = await prisma.employee.findUniqueOrThrow({ where: { id: hrManagerEmp.id } });
    await prisma.user.create({
      data: {
        email: "hr@company.com",
        passwordHash,
        role: Role.HR_ADMIN,
        employeeId: hrEmpFull.id,
      },
    });
  }

  if (deptManagerEmp) {
    await prisma.user.create({
      data: {
        email: "manager@company.com",
        passwordHash,
        role: Role.MANAGER,
        employeeId: deptManagerEmp.id,
      },
    });
  }

  await prisma.user.create({
    data: {
      email: "employee@company.com",
      passwordHash,
      role: Role.EMPLOYEE,
      employeeId: regularEmp.id,
    },
  });

  console.log("Seed users created:");
  console.log("  admin@company.com    / Password123!  (Super Admin)");
  console.log("  hr@company.com       / Password123!  (HR Admin)");
  console.log("  manager@company.com  / Password123!  (Manager)");
  console.log("  employee@company.com / Password123!  (Employee)");

  // Holidays
  await prisma.holiday.createMany({
    data: [
      { name: "New Year's Day", date: new Date(`${year}-01-01`) },
      { name: "Labor Day", date: new Date(`${year}-05-01`) },
      { name: "Independence Day", date: new Date(`${year}-07-04`) },
      { name: "Thanksgiving Day", date: new Date(`${year}-11-27`) },
      { name: "Christmas Day", date: new Date(`${year}-12-25`) },
    ],
    skipDuplicates: true,
  });

  // Attendance for the last 10 weekdays for every active employee
  const attendanceDays: Date[] = [];
  const cursor = new Date();
  while (attendanceDays.length < 10) {
    cursor.setDate(cursor.getDate() - 1);
    if (cursor.getDay() !== 0 && cursor.getDay() !== 6) {
      const d = new Date(cursor);
      d.setHours(0, 0, 0, 0);
      attendanceDays.push(d);
    }
  }

  const attendanceRows = [];
  for (const { id: employeeId } of allEmployees) {
    for (const day of attendanceDays) {
      const roll = Math.random();
      if (roll < 0.04) {
        attendanceRows.push({ employeeId, date: day, status: "ABSENT" as const });
        continue;
      }
      const late = roll < 0.15;
      const clockIn = new Date(day);
      clockIn.setHours(late ? 9 : 8, late ? 20 + Math.floor(Math.random() * 30) : 30 + Math.floor(Math.random() * 25));
      const clockOut = new Date(day);
      clockOut.setHours(17, 15 + Math.floor(Math.random() * 40));
      attendanceRows.push({
        employeeId,
        date: day,
        clockIn,
        clockOut,
        status: late ? ("LATE" as const) : ("PRESENT" as const),
      });
    }
  }
  await prisma.attendance.createMany({ data: attendanceRows });
  console.log(`Created ${attendanceRows.length} attendance records.`);

  // Sample leave requests
  const engineeringReports = allEmployees.filter(
    (e) => e.departmentName === "Engineering" && e.id !== deptManagerEmp?.id
  );
  const annualLeave = leaveTypes.find((t) => t.name === "Annual Leave")!;
  const sickLeave = leaveTypes.find((t) => t.name === "Sick Leave")!;

  const pendingSamples = engineeringReports.slice(0, 3);
  for (const emp of pendingSamples) {
    const start = new Date();
    start.setDate(start.getDate() + 7 + Math.floor(Math.random() * 14));
    const end = new Date(start);
    end.setDate(end.getDate() + 2);
    await prisma.leaveRequest.create({
      data: {
        employeeId: emp.id,
        leaveTypeId: annualLeave.id,
        startDate: start,
        endDate: end,
        days: 3,
        reason: "Personal travel",
        status: "PENDING",
      },
    });
  }

  const historicalSamples = allEmployees.slice(10, 16);
  for (const [i, emp] of historicalSamples.entries()) {
    const start = new Date();
    start.setDate(start.getDate() - (10 + i * 5));
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const leaveType = i % 2 === 0 ? sickLeave : annualLeave;
    const status = i % 3 === 0 ? "REJECTED" : "APPROVED";
    await prisma.leaveRequest.create({
      data: {
        employeeId: emp.id,
        leaveTypeId: leaveType.id,
        startDate: start,
        endDate: end,
        days: 2,
        reason: leaveType.id === sickLeave.id ? "Feeling unwell" : "Family event",
        status,
        decidedAt: new Date(),
      },
    });
    if (status === "APPROVED") {
      await prisma.leaveBalance.updateMany({
        where: { employeeId: emp.id, leaveTypeId: leaveType.id, year },
        data: { usedDays: { increment: 2 } },
      });
    }
  }
  console.log(`Created ${pendingSamples.length + historicalSamples.length} sample leave requests.`);

  // Demo payroll run for last month, so Payroll views have data immediately
  const lastMonthDate = new Date(year, new Date().getMonth() - 1, 1);
  const lastMonth = lastMonthDate.getMonth() + 1;
  const lastMonthYear = lastMonthDate.getFullYear();
  const adminUser = await prisma.user.findUniqueOrThrow({ where: { email: "admin@company.com" } });

  const salariesWithComponents = await prisma.employeeSalary.findMany({
    include: { components: { include: { payComponent: true } } },
  });

  const run = await prisma.payrollRun.create({
    data: {
      month: lastMonth,
      year: lastMonthYear,
      status: "PROCESSED",
      processedAt: lastMonthDate,
      processedById: adminUser.id,
    },
  });

  const payslipRows: Prisma.PayslipCreateManyInput[] = [];
  const payslipLineRows: Prisma.PayslipLineCreateManyInput[] = [];

  for (const salary of salariesWithComponents) {
    const earningLines = [
      { name: "Basic Salary", type: "EARNING" as const, amount: salary.basicSalary },
      ...salary.components
        .filter((c) => c.payComponent.type === "EARNING")
        .map((c) => ({ name: c.payComponent.name, type: "EARNING" as const, amount: c.amount })),
    ];
    const deductionLines = salary.components
      .filter((c) => c.payComponent.type === "DEDUCTION")
      .map((c) => ({ name: c.payComponent.name, type: "DEDUCTION" as const, amount: c.amount }));

    const grossPay = earningLines.reduce((sum, l) => sum + l.amount, 0);
    const totalDeductions = deductionLines.reduce((sum, l) => sum + l.amount, 0);

    const payslipId = crypto.randomUUID();
    payslipRows.push({
      id: payslipId,
      payrollRunId: run.id,
      employeeId: salary.employeeId,
      grossPay,
      totalDeductions,
      netPay: grossPay - totalDeductions,
    });
    for (const line of [...earningLines, ...deductionLines]) {
      payslipLineRows.push({ payslipId, ...line });
    }
  }

  await prisma.payslip.createMany({ data: payslipRows });
  await prisma.payslipLine.createMany({ data: payslipLineRows });
  console.log(`Created demo payroll run for ${lastMonth}/${lastMonthYear} with ${salariesWithComponents.length} payslips.`);

  // Goals for a few employees
  const goalTargets = [regularEmp, ...engineeringReports.slice(0, 2)];
  for (const emp of goalTargets) {
    await prisma.goal.create({
      data: {
        employeeId: emp.id,
        title: "Complete onboarding certification",
        description: "Finish the internal certification track for this role.",
        status: "IN_PROGRESS",
        progress: 60,
        targetDate: new Date(year, new Date().getMonth() + 1, 15),
      },
    });
    await prisma.goal.create({
      data: {
        employeeId: emp.id,
        title: "Improve quarterly KPI by 10%",
        status: "NOT_STARTED",
        progress: 0,
      },
    });
  }
  console.log(`Created goals for ${goalTargets.length} employees.`);

  // Active review cycle with a mix of pending / self-submitted / completed reviews
  const cycle = await prisma.reviewCycle.create({
    data: {
      name: `${new Date().toLocaleString("en-US", { month: "long" })} ${year} Check-in`,
      startDate: new Date(year, new Date().getMonth(), 1),
      endDate: new Date(year, new Date().getMonth() + 1, 0),
      status: "ACTIVE",
    },
  });

  await prisma.performanceReview.createMany({
    data: allEmployees.map((e) => ({ cycleId: cycle.id, employeeId: e.id })),
  });

  // Regular test employee: self-assessment submitted, awaiting manager
  await prisma.performanceReview.update({
    where: { cycleId_employeeId: { cycleId: cycle.id, employeeId: regularEmp.id } },
    data: {
      selfRating: 4,
      selfComments: "Met most goals this period; ramping up on new tooling.",
      selfSubmittedAt: new Date(),
      status: "SELF_SUBMITTED",
    },
  });

  // One Engineering report: fully completed review
  if (engineeringReports[0]) {
    await prisma.performanceReview.update({
      where: { cycleId_employeeId: { cycleId: cycle.id, employeeId: engineeringReports[0].id } },
      data: {
        selfRating: 4,
        selfComments: "Delivered all sprint commitments.",
        selfSubmittedAt: new Date(),
        managerRating: 5,
        managerComments: "Consistently strong contributor this cycle.",
        managerSubmittedAt: new Date(),
        status: "COMPLETED",
      },
    });
  }
  console.log(`Created review cycle "${cycle.name}" with ${allEmployees.length} reviews.`);

  // Onboarding / offboarding checklist templates
  await prisma.checklistTemplate.create({
    data: {
      name: "Standard Onboarding",
      type: "ONBOARDING",
      items: {
        createMany: {
          data: [
            { title: "Sign employment contract", order: 1 },
            { title: "Set up company email and accounts", order: 2 },
            { title: "Issue equipment (laptop, access badge)", order: 3 },
            { title: "Complete orientation session", order: 4 },
            { title: "Introduce to team and manager", order: 5 },
          ],
        },
      },
    },
  });

  await prisma.checklistTemplate.create({
    data: {
      name: "Standard Offboarding",
      type: "OFFBOARDING",
      items: {
        createMany: {
          data: [
            { title: "Conduct exit interview", order: 1 },
            { title: "Return company equipment", order: 2 },
            { title: "Revoke system and building access", order: 3 },
            { title: "Final payroll and benefits settlement", order: 4 },
            { title: "Knowledge transfer to team", order: 5 },
          ],
        },
      },
    },
  });
  console.log("Created onboarding and offboarding checklist templates.");

  // Sample recruitment pipeline
  const engineeringDeptId = departmentMap["Engineering"].id;
  const salesDeptId = departmentMap["Sales"].id;

  const requisition1 = await prisma.jobRequisition.create({
    data: {
      title: "Senior Software Engineer",
      departmentId: engineeringDeptId,
      description: "Looking for an experienced backend engineer to join the platform team.",
      openings: 2,
      status: "OPEN",
      createdById: adminUser.id,
    },
  });

  const requisition2 = await prisma.jobRequisition.create({
    data: {
      title: "Account Executive",
      departmentId: salesDeptId,
      description: "Drive new business growth across our core market.",
      openings: 1,
      status: "OPEN",
      createdById: adminUser.id,
    },
  });

  const candidateData = [
    { firstName: "Liya", lastName: "Haile", email: "liya.haile@example.com", req: requisition1, stage: "INTERVIEW" as const },
    { firstName: "Samuel", lastName: "Kassa", email: "samuel.kassa@example.com", req: requisition1, stage: "SCREENING" as const },
    { firstName: "Megan", lastName: "Price", email: "megan.price@example.com", req: requisition1, stage: "APPLIED" as const },
    { firstName: "Daniel", lastName: "Worku", email: "daniel.worku@example.com", req: requisition2, stage: "OFFER" as const },
  ];

  for (const c of candidateData) {
    const candidate = await prisma.candidate.create({
      data: { firstName: c.firstName, lastName: c.lastName, email: c.email },
    });
    const application = await prisma.application.create({
      data: { jobRequisitionId: c.req.id, candidateId: candidate.id, stage: c.stage },
    });

    if (c.stage === "INTERVIEW" && deptManagerEmp) {
      await prisma.interview.create({
        data: {
          applicationId: application.id,
          interviewerId: deptManagerEmp.id,
          scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        },
      });
    }

    if (c.stage === "OFFER") {
      await prisma.offer.create({
        data: {
          applicationId: application.id,
          salaryOffered: 4800,
          startDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
          status: "SENT",
          sentAt: new Date(),
        },
      });
    }
  }
  console.log(`Created ${candidateData.length} sample candidates across 2 job requisitions.`);

  // Sample assets
  const assetTargets = allEmployees.slice(0, 20);
  await prisma.asset.createMany({
    data: assetTargets.map((emp, i) => ({
      name: i % 3 === 0 ? "MacBook Pro 14\"" : i % 3 === 1 ? "Dell Latitude 5440" : "iPhone 14",
      category: i % 3 === 2 ? "Phone" : "Laptop",
      serialNumber: `SN-${1000 + i}`,
      purchaseDate: new Date(year - 1, i % 12, 1),
      status: "ASSIGNED",
      assignedToId: emp.id,
      assignedAt: new Date(year - 1, i % 12, 5),
    })),
  });
  await prisma.asset.createMany({
    data: [
      { name: "MacBook Air M2", category: "Laptop", serialNumber: "SN-SPARE-1", status: "AVAILABLE" },
      { name: "Dell Latitude 5440", category: "Laptop", serialNumber: "SN-SPARE-2", status: "AVAILABLE" },
      { name: "iPhone 13", category: "Phone", serialNumber: "SN-SPARE-3", status: "MAINTENANCE" },
    ],
  });
  console.log(`Created ${assetTargets.length + 3} sample assets.`);

  // Sample announcements
  await prisma.announcement.createMany({
    data: [
      {
        title: "Welcome to the new HR portal",
        body: "We've launched a new employee self-service portal. Explore your dashboard, submit leave requests, and view your payslips all in one place.",
        authorId: adminUser.id,
        pinned: true,
      },
      {
        title: "Q4 all-hands meeting scheduled",
        body: "Join us next Friday at 10am for the quarterly all-hands meeting. Calendar invites to follow.",
        authorId: adminUser.id,
        pinned: false,
      },
      {
        title: "Office closed for public holiday",
        body: "A reminder that the office will be closed in observance of the upcoming public holiday.",
        authorId: adminUser.id,
        pinned: false,
      },
    ],
  });
  console.log("Created sample announcements.");
}

// main() starts by truncating everything, so retrying it from scratch after a
// transient connection drop (common against a remote DB from a flaky network) is
// safe and idempotent — cheaper than hunting down every call site that could drop.
const MAX_ATTEMPTS = 12;
const RETRY_DELAY_MS = 5000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runWithRetry() {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await main();
      return;
    } catch (e) {
      console.error(`Attempt ${attempt}/${MAX_ATTEMPTS} failed:`, e instanceof Error ? e.message : e);
      if (attempt === MAX_ATTEMPTS) throw e;
      console.log(`Waiting ${RETRY_DELAY_MS}ms before retrying from a clean slate...`);
      await sleep(RETRY_DELAY_MS);
    }
  }
}

runWithRetry()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
