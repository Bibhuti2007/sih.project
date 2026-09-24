import {
  Router,
  type IRouter,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { getAuth } from "@clerk/express";
import { and, desc, eq } from "drizzle-orm";
import { db, activityTable, issuesTable, teamsTable } from "@workspace/db";
import {
  CreateIssueBody,
  CreateIssueResponse,
  GetActivityQueryParams,
  GetActivityResponse,
  GetDashboardSummaryResponse,
  GetIssueParams,
  GetIssueResponse,
  ListIssuesQueryParams,
  ListIssuesResponse,
  ListTeamIssuesParams,
  ListTeamIssuesResponse,
  ListTeamsResponse,
  UpdateIssueStatusBody,
  UpdateIssueStatusParams,
  UpdateIssueStatusResponse,
} from "@workspace/api-zod";

type AuthedRequest = Request & { userId: string };

const router: IRouter = Router();
let seedPromise: Promise<void> | null = null;

const seededTeams = [
  {
    name: "Civic Systems Lab",
    university: "IIT Delhi",
    specialization: "Public infrastructure & mobility",
    members: 8,
    activeIssues: 2,
    capacity: 8,
    availability: "available",
    accent: "teal",
  },
  {
    name: "Sahaayata Collective",
    university: "Delhi University",
    specialization: "Community health & inclusion",
    members: 6,
    activeIssues: 4,
    capacity: 6,
    availability: "busy",
    accent: "coral",
  },
  {
    name: "Green Circuit",
    university: "IIT Bombay",
    specialization: "Environment & water systems",
    members: 5,
    activeIssues: 1,
    capacity: 7,
    availability: "available",
    accent: "lime",
  },
];

const seededIssues = [
  {
    reference: "JS-2409",
    title: "Streetlight outage near Saket Metro",
    description:
      "Three streetlights have been out for two weeks, making the walk from the metro unsafe after 8pm.",
    location: "Saket, New Delhi",
    category: "Public safety",
    priority: "high",
    status: "in_progress",
    aiSummary:
      "A public-safety issue affecting a high-footfall pedestrian route with a clear infrastructure repair path.",
    progress: 68,
    nextAction: "Electrical inspection scheduled",
    createdBy: "seed-citizen",
    assignedTeamName: "Civic Systems Lab",
  },
  {
    reference: "JS-2397",
    title: "Overflowing waste collection point",
    description:
      "The collection point beside the community park overflows every weekend and attracts stray animals.",
    location: "Kalkaji, New Delhi",
    category: "Waste & sanitation",
    priority: "medium",
    status: "in_review",
    aiSummary:
      "A recurring sanitation issue likely requiring pickup-frequency review and a better collection schedule.",
    progress: 34,
    nextAction: "Agency review in progress",
    createdBy: "seed-citizen",
    assignedTeamName: "Green Circuit",
  },
  {
    reference: "JS-2381",
    title: "Accessible ramp needed at ward office",
    description:
      "The ward office entrance has stairs only, blocking independent access for wheelchair users.",
    location: "Lajpat Nagar, New Delhi",
    category: "Accessibility",
    priority: "high",
    status: "solved",
    aiSummary:
      "An accessibility barrier at a public service location; a compact ramp retrofit can remove the obstacle.",
    progress: 100,
    nextAction: "Solution verified by citizen",
    createdBy: "seed-citizen",
    assignedTeamName: "Sahaayata Collective",
  },
];

const progressByStatus = {
  submitted: 12,
  in_review: 34,
  in_progress: 68,
  solved: 100,
} as const;

const nextActionByStatus = {
  submitted: "Awaiting initial review",
  in_review: "Agency review in progress",
  in_progress: "Team is working on a solution",
  solved: "Solution verified by citizen",
} as const;

async function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (async () => {
      let teams = await db.select().from(teamsTable);
      if (teams.length === 0) {
        await db.insert(teamsTable).values(seededTeams);
        teams = await db.select().from(teamsTable);
      }

      const existingIssues = await db.select().from(issuesTable).limit(1);
      if (existingIssues.length > 0) return;

      const seededRows = seededIssues.map((issue) => ({
        ...issue,
        assignedTeamId:
          teams.find((team) => team.name === issue.assignedTeamName)?.id ??
          teams[0].id,
      }));
      const created = await db
        .insert(issuesTable)
        .values(
          seededRows.map(({ assignedTeamName: _assignedTeamName, ...issue }) => issue),
        )
        .returning();

      await db.insert(activityTable).values(
        created.flatMap((issue) => [
          {
            issueId: issue.id,
            message: "Issue submitted by a citizen",
            type: "submitted",
          },
          {
            issueId: issue.id,
            message: `AI categorized this as ${issue.category}`,
            type: "analyzed",
          },
          {
            issueId: issue.id,
            message: `Assigned to the best-fit team for ${issue.location}`,
            type: "assigned",
          },
        ]),
      );
    })();
  }
  await seedPromise;
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Sign in to access Jansetu" });
    return;
  }
  (req as AuthedRequest).userId = userId;
  next();
}

async function rowsToIssues(rows: Array<{ issue: typeof issuesTable.$inferSelect; team: typeof teamsTable.$inferSelect }>) {
  return rows.map(({ issue, team }) => ({
    ...issue,
    assignedTeamName: team.name,
    assignedUniversity: team.university,
  }));
}

async function analyzeIssue(
  input: { title: string; description: string; location: string },
  teams: Array<typeof teamsTable.$inferSelect>,
) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-5-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are Jansetu's civic triage analyst. Categorize the issue, set a practical priority, write a one-sentence summary, choose the best team id, and name the next action. Return only JSON with keys category, priority, summary, teamId, nextAction. Choose a team that matches its specialization and has capacity.",
        },
        {
          role: "user",
          content: JSON.stringify({
            issue: input,
            teams: teams.map((team) => ({
              id: team.id,
              name: team.name,
              specialization: team.specialization,
              availability: team.availability,
              activeIssues: team.activeIssues,
              capacity: team.capacity,
            })),
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI analysis failed with status ${response.status}`);
  }
  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned an empty analysis");

  const parsed = JSON.parse(content) as Record<string, unknown>;
  const priorities = ["low", "medium", "high", "urgent"] as const;
  const teamId = Number(parsed.teamId);
  const team = teams.find((candidate) => candidate.id === teamId);
  if (
    typeof parsed.category !== "string" ||
    typeof parsed.summary !== "string" ||
    typeof parsed.nextAction !== "string" ||
    !priorities.includes(parsed.priority as (typeof priorities)[number]) ||
    !team
  ) {
    throw new Error("OpenAI returned an invalid civic analysis");
  }
  return {
    category: parsed.category,
    priority: parsed.priority as (typeof priorities)[number],
    summary: parsed.summary,
    nextAction: parsed.nextAction,
    team,
  };
}

router.use(requireAuth);

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  await ensureSeeded();
  const rows = await db.select().from(issuesTable);
  const categoryCounts = new Map<string, number>();
  const statusCounts = new Map<string, number>();
  for (const issue of rows) {
    categoryCounts.set(issue.category, (categoryCounts.get(issue.category) ?? 0) + 1);
    statusCounts.set(issue.status, (statusCounts.get(issue.status) ?? 0) + 1);
  }
  const solved = rows.filter((issue) => issue.status === "solved").length;
  const summary = {
    submitted: rows.length,
    inProgress: rows.filter((issue) => issue.status === "in_progress" || issue.status === "in_review").length,
    solved,
    responseRate: rows.length === 0 ? 0 : Math.round((solved / rows.length) * 100),
    weeklyChange: 18,
    categoryBreakdown: [...categoryCounts.entries()].map(([label, count]) => ({ label, count })),
    statusBreakdown: [
      { label: "Submitted", count: statusCounts.get("submitted") ?? 0 },
      { label: "In review", count: statusCounts.get("in_review") ?? 0 },
      { label: "In progress", count: statusCounts.get("in_progress") ?? 0 },
      { label: "Solved", count: statusCounts.get("solved") ?? 0 },
    ],
  };
  res.json(GetDashboardSummaryResponse.parse(summary));
});

router.get("/activity", async (req, res): Promise<void> => {
  await ensureSeeded();
  const query = GetActivityQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const rows = await db
    .select({ activity: activityTable, issue: issuesTable })
    .from(activityTable)
    .innerJoin(issuesTable, eq(activityTable.issueId, issuesTable.id))
    .orderBy(desc(activityTable.createdAt))
    .limit(query.data.limit);
  res.json(
    GetActivityResponse.parse(
      rows.map(({ activity, issue }) => ({
        ...activity,
        issueReference: issue.reference,
      })),
    ),
  );
});

router.get("/issues", async (req, res): Promise<void> => {
  await ensureSeeded();
  const query = ListIssuesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const filters = [];
  if (query.data.status) filters.push(eq(issuesTable.status, query.data.status));
  if (query.data.mine) {
    filters.push(eq(issuesTable.createdBy, (req as AuthedRequest).userId));
  }
  const base = db
    .select({ issue: issuesTable, team: teamsTable })
    .from(issuesTable)
    .innerJoin(teamsTable, eq(issuesTable.assignedTeamId, teamsTable.id));
  const rows = filters.length > 0 ? await base.where(and(...filters)) : await base;
  res.json(ListIssuesResponse.parse(await rowsToIssues(rows)));
});

router.post("/issues", async (req, res): Promise<void> => {
  await ensureSeeded();
  const parsed = CreateIssueBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const teams = await db.select().from(teamsTable);
  let analysis;
  try {
    analysis = await analyzeIssue(parsed.data, teams);
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : "AI analysis failed" });
    return;
  }
  const nextId = (await db.select().from(issuesTable)).length + 1;
  const [created] = await db
    .insert(issuesTable)
    .values({
      reference: `JS-${String(2400 + nextId).padStart(4, "0")}`,
      title: parsed.data.title,
      description: parsed.data.description,
      location: parsed.data.location,
      contact: parsed.data.contact ?? null,
      attachmentName: parsed.data.attachmentName ?? null,
      category: analysis.category,
      priority: analysis.priority,
      status: "submitted",
      assignedTeamId: analysis.team.id,
      aiSummary: analysis.summary,
      progress: 12,
      nextAction: analysis.nextAction,
      createdBy: (req as AuthedRequest).userId,
    })
    .returning();

  await db.insert(activityTable).values([
    { issueId: created.id, message: "Issue submitted by a citizen", type: "submitted" },
    { issueId: created.id, message: `AI categorized this as ${analysis.category}`, type: "analyzed" },
    { issueId: created.id, message: `Assigned to ${analysis.team.name}`, type: "assigned" },
  ]);
  const [row] = await db
    .select({ issue: issuesTable, team: teamsTable })
    .from(issuesTable)
    .innerJoin(teamsTable, eq(issuesTable.assignedTeamId, teamsTable.id))
    .where(eq(issuesTable.id, created.id));
  res.status(201).json(CreateIssueResponse.parse((await rowsToIssues([row]))[0]));
});

router.get("/issues/:id", async (req, res): Promise<void> => {
  await ensureSeeded();
  const params = GetIssueParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .select({ issue: issuesTable, team: teamsTable })
    .from(issuesTable)
    .innerJoin(teamsTable, eq(issuesTable.assignedTeamId, teamsTable.id))
    .where(eq(issuesTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Issue not found" });
    return;
  }
  const timeline = await db
    .select()
    .from(activityTable)
    .where(eq(activityTable.issueId, params.data.id))
    .orderBy(activityTable.createdAt);
  const [issue] = await rowsToIssues([row]);
  res.json(
    GetIssueResponse.parse({
      ...issue,
      timeline: timeline.map((item) => ({ ...item, issueReference: issue.reference })),
    }),
  );
});

router.patch("/issues/:id", async (req, res): Promise<void> => {
  const params = UpdateIssueStatusParams.safeParse(req.params);
  const parsed = UpdateIssueStatusBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [updated] = await db
    .update(issuesTable)
    .set({
      status: parsed.data.status,
      progress: progressByStatus[parsed.data.status],
      nextAction: parsed.data.note ?? nextActionByStatus[parsed.data.status],
      updatedAt: new Date(),
    })
    .where(eq(issuesTable.id, params.data.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Issue not found" });
    return;
  }
  await db.insert(activityTable).values({
    issueId: updated.id,
    message: parsed.data.note ?? `Issue moved to ${parsed.data.status.replace("_", " ")}`,
    type: parsed.data.status === "solved" ? "solved" : "update",
  });
  const [row] = await db
    .select({ issue: issuesTable, team: teamsTable })
    .from(issuesTable)
    .innerJoin(teamsTable, eq(issuesTable.assignedTeamId, teamsTable.id))
    .where(eq(issuesTable.id, updated.id));
  res.json(UpdateIssueStatusResponse.parse((await rowsToIssues([row]))[0]));
});

router.get("/teams", async (_req, res): Promise<void> => {
  await ensureSeeded();
  res.json(ListTeamsResponse.parse(await db.select().from(teamsTable)));
});

router.get("/teams/:id/issues", async (req, res): Promise<void> => {
  await ensureSeeded();
  const params = ListTeamIssuesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const rows = await db
    .select({ issue: issuesTable, team: teamsTable })
    .from(issuesTable)
    .innerJoin(teamsTable, eq(issuesTable.assignedTeamId, teamsTable.id))
    .where(eq(teamsTable.id, params.data.id));
  res.json(ListTeamIssuesResponse.parse(await rowsToIssues(rows)));
});

export default router;