// KPI Service
// Business logic for dashboards and analytics

const { prisma } = require("../config/database");

/**
 * Get comprehensive dashboard summary
 * @returns {Promise<Object>} Dashboard KPIs
 */
async function getDashboardSummary() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);

  // Parallel queries for performance
  const [patientStats, encounterStats, orderStats, noteStats] =
    await Promise.all([
      getPatientKPIs(today, thisMonth),
      getEncounterKPIs(today, thisMonth),
      getOrderKPIs(today),
      getClinicalNoteKPIs(today),
    ]);

  return {
    patients: patientStats,
    encounters: encounterStats,
    orders: orderStats,
    clinicalNotes: noteStats,
    generatedAt: new Date(),
  };
}

/**
 * Get patient KPIs
 */
async function getPatientKPIs(today, thisMonth) {
  const [
    total,
    registeredToday,
    registeredThisMonth,
    sexDistribution,
    ageGroups,
  ] = await Promise.all([
    prisma.patient.count(),
    prisma.patient.count({ where: { createdAt: { gte: today } } }),
    prisma.patient.count({ where: { createdAt: { gte: thisMonth } } }),
    prisma.patient.groupBy({
      by: ["sex"],
      _count: true,
    }),
    getAgeDistribution(),
  ]);

  return {
    total,
    registeredToday,
    registeredThisMonth,
    sexDistribution: sexDistribution.map((item) => ({
      sex: item.sex,
      count: item._count,
    })),
    ageGroups,
  };
}

/**
 * Get encounter KPIs
 */
async function getEncounterKPIs(today, thisMonth) {
  const [
    totalOpen,
    totalClosed,
    admissionsToday,
    dischargesToday,
    admissionsThisMonth,
    typeDistribution,
    avgLengthOfStay,
  ] = await Promise.all([
    prisma.encounter.count({ where: { status: "open" } }),
    prisma.encounter.count({ where: { status: "closed" } }),
    prisma.encounter.count({ where: { admissionDate: { gte: today } } }),
    prisma.encounter.count({ where: { dischargeDate: { gte: today } } }),
    prisma.encounter.count({ where: { admissionDate: { gte: thisMonth } } }),
    prisma.encounter.groupBy({
      by: ["encounterType"],
      _count: true,
      where: { status: "open" },
    }),
    getAverageLengthOfStay(),
  ]);

  return {
    totalOpen,
    totalClosed,
    admissionsToday,
    dischargesToday,
    admissionsThisMonth,
    typeDistribution: typeDistribution.map((item) => ({
      type: item.encounterType,
      count: item._count,
    })),
    avgLengthOfStayDays: avgLengthOfStay,
  };
}

/**
 * Get order KPIs
 */
async function getOrderKPIs(today) {
  const [
    totalPending,
    totalToday,
    criticalResults,
    avgTurnaroundHours,
    pendingByPriority,
  ] = await Promise.all([
    prisma.order.count({
      where: { status: { in: ["pending", "collected", "processing"] } },
    }),
    prisma.order.count({ where: { createdAt: { gte: today } } }),
    prisma.result.count({ where: { criticalFlag: true } }),
    calculateAverageTurnaround(),
    prisma.order.groupBy({
      by: ["priority"],
      _count: true,
      where: { status: { in: ["pending", "collected", "processing"] } },
    }),
  ]);

  return {
    totalPending,
    ordersToday: totalToday,
    criticalResults,
    avgTurnaroundHours: Math.round(avgTurnaroundHours * 10) / 10,
    pendingByPriority: pendingByPriority.map((item) => ({
      priority: item.priority,
      count: item._count,
    })),
  };
}

/**
 * Get clinical note KPIs
 */
async function getClinicalNoteKPIs(today) {
  const [totalNotes, notesToday, notesWithVitals, noteTypeDistribution] =
    await Promise.all([
      prisma.clinicalNote.count(),
      prisma.clinicalNote.count({ where: { createdAt: { gte: today } } }),
      prisma.clinicalNote.count({ where: { vitals: { not: null } } }),
      prisma.clinicalNote.groupBy({
        by: ["noteType"],
        _count: true,
      }),
    ]);

  return {
    totalNotes,
    notesToday,
    notesWithVitals,
    noteTypeDistribution: noteTypeDistribution.map((item) => ({
      type: item.noteType,
      count: item._count,
    })),
  };
}

/**
 * Get department performance
 * @returns {Promise<Array>} Department statistics
 */
async function getDepartmentPerformance() {
  const departments = await prisma.department.findMany({
    where: { isActive: true },
  });

  const departmentStats = await Promise.all(
    departments.map(async (dept) => {
      const [openEncounters, totalEncounters, avgLOS, pendingOrders] =
        await Promise.all([
          prisma.encounter.count({
            where: { departmentId: dept.id, status: "open" },
          }),
          prisma.encounter.count({
            where: { departmentId: dept.id },
          }),
          getAvgLengthOfStayByDepartment(dept.id),
          prisma.order.count({
            where: {
              encounter: { departmentId: dept.id },
              status: { in: ["pending", "collected", "processing"] },
            },
          }),
        ]);

      return {
        departmentId: dept.id,
        departmentName: dept.name,
        departmentCode: dept.code,
        openEncounters,
        totalEncounters,
        avgLengthOfStayDays: avgLOS,
        pendingOrders,
      };
    })
  );

  return departmentStats;
}

/**
 * Get patient volume trends
 * @param {number} days - Number of days to look back
 * @returns {Promise<Array>} Daily patient registrations
 */
async function getPatientVolumeTrends(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const patients = await prisma.patient.findMany({
    where: {
      createdAt: { gte: startDate },
    },
    select: {
      createdAt: true,
    },
  });

  // Group by date
  const trends = {};
  patients.forEach((patient) => {
    const date = patient.createdAt.toISOString().split("T")[0];
    trends[date] = (trends[date] || 0) + 1;
  });

  // Convert to array and fill missing dates
  const result = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];
    result.push({
      date: dateStr,
      count: trends[dateStr] || 0,
    });
  }

  return result;
}

/**
 * Get encounter volume trends
 * @param {number} days - Number of days to look back
 * @returns {Promise<Array>} Daily encounters
 */
async function getEncounterVolumeTrends(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const encounters = await prisma.encounter.findMany({
    where: {
      admissionDate: { gte: startDate },
    },
    select: {
      admissionDate: true,
      encounterType: true,
    },
  });

  // Group by date and type
  const trends = {};
  encounters.forEach((enc) => {
    const date = enc.admissionDate.toISOString().split("T")[0];
    if (!trends[date]) {
      trends[date] = { opd: 0, ipd: 0, emergency: 0 };
    }
    trends[date][enc.encounterType] =
      (trends[date][enc.encounterType] || 0) + 1;
  });

  // Convert to array
  const result = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];
    result.push({
      date: dateStr,
      opd: trends[dateStr]?.opd || 0,
      ipd: trends[dateStr]?.ipd || 0,
      emergency: trends[dateStr]?.emergency || 0,
      total:
        (trends[dateStr]?.opd || 0) +
        (trends[dateStr]?.ipd || 0) +
        (trends[dateStr]?.emergency || 0),
    });
  }

  return result;
}

/**
 * Get data quality metrics
 * @returns {Promise<Object>} Data quality scores
 */
async function getDataQualityMetrics() {
  const [
    totalPatients,
    patientsWithPhone,
    patientsWithAddress,
    totalEncounters,
    encountersWithDiagnosis,
    encountersWithNotes,
    totalOrders,
    ordersWithResults,
    openIssues,
  ] = await Promise.all([
    prisma.patient.count(),
    prisma.patient.count({ where: { phoneNumber: { not: null } } }),
    prisma.patient.count({ where: { address: { not: null } } }),
    prisma.encounter.count(),
    prisma.encounter.count({ where: { diagnosis: { not: null } } }),
    prisma.encounter
      .findMany({
        where: { clinicalNotes: { some: {} } },
        select: { id: true },
      })
      .then((e) => e.length),
    prisma.order.count(),
    prisma.order.count({ where: { results: { some: {} } } }),
    prisma.dataQualityIssue.count({ where: { status: "open" } }),
  ]);

  const completenessScore = calculateCompletenessScore({
    patientsWithPhone,
    patientsWithAddress,
    totalPatients,
    encountersWithDiagnosis,
    encountersWithNotes,
    totalEncounters,
    ordersWithResults,
    totalOrders,
  });

  return {
    completenessScore,
    patientDataCompleteness: {
      phoneNumber:
        totalPatients > 0
          ? Math.round((patientsWithPhone / totalPatients) * 100)
          : 0,
      address:
        totalPatients > 0
          ? Math.round((patientsWithAddress / totalPatients) * 100)
          : 0,
    },
    encounterDataCompleteness: {
      diagnosis:
        totalEncounters > 0
          ? Math.round((encountersWithDiagnosis / totalEncounters) * 100)
          : 0,
      clinicalNotes:
        totalEncounters > 0
          ? Math.round((encountersWithNotes / totalEncounters) * 100)
          : 0,
    },
    orderCompleteness: {
      withResults:
        totalOrders > 0
          ? Math.round((ordersWithResults / totalOrders) * 100)
          : 0,
    },
    openDataQualityIssues: openIssues,
  };
}

/**
 * Helper: Calculate age distribution
 */
async function getAgeDistribution() {
  const patients = await prisma.patient.findMany({
    where: {
      OR: [{ dateOfBirth: { not: null } }, { ageEstimate: { not: null } }],
    },
    select: {
      dateOfBirth: true,
      ageEstimate: true,
    },
  });

  const ageGroups = {
    "0-5": 0,
    "6-17": 0,
    "18-35": 0,
    "36-50": 0,
    "51-65": 0,
    "65+": 0,
  };

  patients.forEach((patient) => {
    let age;
    if (patient.dateOfBirth) {
      const today = new Date();
      const birthDate = new Date(patient.dateOfBirth);
      age = today.getFullYear() - birthDate.getFullYear();
    } else if (patient.ageEstimate) {
      age = patient.ageEstimate;
    } else {
      return;
    }

    if (age <= 5) ageGroups["0-5"]++;
    else if (age <= 17) ageGroups["6-17"]++;
    else if (age <= 35) ageGroups["18-35"]++;
    else if (age <= 50) ageGroups["36-50"]++;
    else if (age <= 65) ageGroups["51-65"]++;
    else ageGroups["65+"]++;
  });

  return Object.keys(ageGroups).map((group) => ({
    ageGroup: group,
    count: ageGroups[group],
  }));
}

/**
 * Helper: Calculate average length of stay
 */
async function getAverageLengthOfStay() {
  const closedEncounters = await prisma.encounter.findMany({
    where: {
      status: "closed",
      dischargeDate: { not: null },
      encounterType: "ipd",
    },
    select: {
      admissionDate: true,
      dischargeDate: true,
    },
    take: 100,
    orderBy: { dischargeDate: "desc" },
  });

  if (closedEncounters.length === 0) return 0;

  const totalDays = closedEncounters.reduce((sum, enc) => {
    const admission = new Date(enc.admissionDate);
    const discharge = new Date(enc.dischargeDate);
    const days = (discharge - admission) / (1000 * 60 * 60 * 24);
    return sum + days;
  }, 0);

  return Math.round((totalDays / closedEncounters.length) * 10) / 10;
}

/**
 * Helper: Calculate average length of stay by department
 */
async function getAvgLengthOfStayByDepartment(departmentId) {
  const encounters = await prisma.encounter.findMany({
    where: {
      departmentId,
      status: "closed",
      dischargeDate: { not: null },
    },
    select: {
      admissionDate: true,
      dischargeDate: true,
    },
    take: 50,
    orderBy: { dischargeDate: "desc" },
  });

  if (encounters.length === 0) return 0;

  const totalDays = encounters.reduce((sum, enc) => {
    const days =
      (new Date(enc.dischargeDate) - new Date(enc.admissionDate)) /
      (1000 * 60 * 60 * 24);
    return sum + days;
  }, 0);

  return Math.round((totalDays / encounters.length) * 10) / 10;
}

/**
 * Helper: Calculate average turnaround time for orders
 */
async function calculateAverageTurnaround() {
  const completedOrders = await prisma.order.findMany({
    where: {
      status: "completed",
      createdAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      },
    },
    include: {
      results: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    take: 100,
  });

  if (completedOrders.length === 0) return 0;

  const turnaroundTimes = completedOrders
    .filter((order) => order.results.length > 0)
    .map((order) => {
      const orderTime = new Date(order.createdAt);
      const resultTime = new Date(order.results[0].createdAt);
      return (resultTime - orderTime) / (1000 * 60 * 60); // Hours
    });

  if (turnaroundTimes.length === 0) return 0;

  return turnaroundTimes.reduce((a, b) => a + b, 0) / turnaroundTimes.length;
}

/**
 * Helper: Calculate overall completeness score
 */
function calculateCompletenessScore(metrics) {
  const scores = [];

  if (metrics.totalPatients > 0) {
    scores.push((metrics.patientsWithPhone / metrics.totalPatients) * 100);
    scores.push((metrics.patientsWithAddress / metrics.totalPatients) * 100);
  }

  if (metrics.totalEncounters > 0) {
    scores.push(
      (metrics.encountersWithDiagnosis / metrics.totalEncounters) * 100
    );
    scores.push((metrics.encountersWithNotes / metrics.totalEncounters) * 100);
  }

  if (metrics.totalOrders > 0) {
    scores.push((metrics.ordersWithResults / metrics.totalOrders) * 100);
  }

  if (scores.length === 0) return 0;

  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

module.exports = {
  getDashboardSummary,
  getDepartmentPerformance,
  getPatientVolumeTrends,
  getEncounterVolumeTrends,
  getDataQualityMetrics,
};
