import "dotenv/config";
import express from "express";
import cors from "cors";
import axios from "axios";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);
const DEFAULT_LOCATION = "New York, NY";

const yelpCategoryMap: Record<string, string> = {
  venue: "venues",
  catering: "catering",
  photography: "photographers",
  music: "djs",
  decor: "florists,party_equipment_rentals",
  bar: "bartenders",
  invitations: "graphicdesign",
  videography: "videographers",
};

const resolveYelpCategories = (raw?: unknown): string | undefined => {
  if (typeof raw !== "string") return undefined;

  const normalized = raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .flatMap((value) => (yelpCategoryMap[value] || value).split(","))
    .map((value) => value.trim())
    .filter(Boolean);

  return normalized.length ? Array.from(new Set(normalized)).join(",") : undefined;
};

const createYelpSearchParams = (paramsSource: Record<string, unknown>) => {
  const term = typeof paramsSource.term === "string" && paramsSource.term.trim()
    ? paramsSource.term.trim()
    : "event vendors";

  const location = typeof paramsSource.location === "string" && paramsSource.location.trim()
    ? paramsSource.location.trim()
    : undefined;

  const latitude = Number(paramsSource.latitude);
  const longitude = Number(paramsSource.longitude);
  const categories = resolveYelpCategories(paramsSource.categories);
  const limit = Math.min(Math.max(Number(paramsSource.limit) || 20, 1), 20);

  const params: Record<string, string | number> = {
    term,
    limit,
    sort_by: "best_match",
  };

  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    params.latitude = latitude;
    params.longitude = longitude;
  } else {
    params.location = location || DEFAULT_LOCATION;
  }

  if (categories) {
    params.categories = categories;
  }

  return params;
};

async function startServer() {
  const app = express();

  app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }));
  app.use(express.json());

  console.log(`[Server] Starting in ${process.env.NODE_ENV || "development"} mode`);
  console.log(`[Server] Port: ${PORT}`);
  console.log(`[Server] YELP_API_KEY is ${process.env.YELP_API_KEY ? "present" : "missing"}`);

  app.use((req, res, next) => {
    if (req.url.startsWith("/api")) {
      console.log(`[API] ${req.method} ${req.url}`);
    }
    next();
  });

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString(), env: process.env.NODE_ENV || "development" });
  });

  app.get("/api/debug", (req, res) => {
    res.json({
      status: "ok",
      env: process.env.NODE_ENV || "development",
      yelpKeySet: Boolean(process.env.YELP_API_KEY?.trim()),
      yelpKeyLength: process.env.YELP_API_KEY?.trim().length || 0,
      geminiKeySet: Boolean(process.env.GEMINI_API_KEY?.trim()),
      timestamp: new Date().toISOString(),
      method: req.method,
    });
  });

  const handleVendorSearch = async (req: express.Request, res: express.Response) => {
    const requestId = Math.random().toString(36).slice(2, 10);
    res.setHeader("X-Debug-Request-Id", requestId);

    const paramsSource = req.method === "POST" ? req.body : req.query;
    const apiKey = process.env.YELP_API_KEY?.trim();

    if (!apiKey) {
      return res.status(500).json({
        error: "YELP_API_KEY is not configured on the server.",
        help: "Add YELP_API_KEY to your .env.local file or deployment environment before searching vendors.",
      });
    }

    try {
      const params = createYelpSearchParams(paramsSource as Record<string, unknown>);
      console.log(`[Yelp][${requestId}] Search params:`, params);

      const yelpResponse = await axios.get("https://api.yelp.com/v3/businesses/search", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
          "User-Agent": "EventrovaPlanner/1.0",
        },
        params,
        timeout: 15000,
      });

      res.json(yelpResponse.data);
    } catch (error: any) {
      const status = error.response?.status || 500;
      const errorData = error.response?.data;
      console.error(`[Yelp][${requestId}] Error ${status}:`, errorData || error.message);

      if (status === 400) {
        return res.status(400).json({
          error: "Invalid Yelp search request.",
          details: errorData || error.message,
          requestId,
        });
      }

      if (status === 401) {
        return res.status(401).json({
          error: "Invalid Yelp API Key.",
          details: "Yelp rejected the API key. Verify the key in your environment settings.",
          requestId,
        });
      }

      res.status(status).json({
        error: "Yelp API Error",
        details: errorData || error.message,
        status,
        requestId,
      });
    }
  };

  app.get("/api/yelp/search", handleVendorSearch);
  app.post("/api/yelp/search", handleVendorSearch);

  app.get("/api/yelp/test", async (_req, res) => {
    const apiKey = process.env.YELP_API_KEY?.trim();

    if (!apiKey) {
      return res.json({
        status: "missing_key",
        message: "YELP_API_KEY is not set.",
      });
    }

    try {
      const response = await axios.get("https://api.yelp.com/v3/businesses/search", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "User-Agent": "EventrovaPlanner/1.0",
        },
        params: { term: "event venue", location: DEFAULT_LOCATION, limit: 1 },
        timeout: 15000,
      });

      res.json({
        status: "ok",
        message: "Successfully connected to Yelp API.",
        businessesReturned: response.data.businesses?.length || 0,
      });
    } catch (error: any) {
      res.status(500).json({
        status: "error",
        message: error.message,
        details: error.response?.data || null,
      });
    }
  });

  app.all("/api/*all", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      root: process.cwd(),
      server: { middlewareMode: true },
      appType: "spa",
    });

    app.use(vite.middlewares);

    app.get("*all", async (req, res, next) => {
      if (req.url.startsWith("/api")) return next();
      if (req.url.includes(".") && !req.url.endsWith(".html")) return next();

      try {
        const indexPath = path.resolve(__dirname, "index.html");
        let template = fs.readFileSync(indexPath, "utf-8");
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (error: any) {
        vite.ssrFixStacktrace(error);
        next(error);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res, next) => {
      if (req.url.startsWith("/api")) return next();
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.all("*all", (req, res) => {
    res.status(404).json({ error: `Not Found: ${req.method} ${req.url}` });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
