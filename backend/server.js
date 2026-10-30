
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

const demoVehicles = [
  {id:1,name:"Truck 01",driver:"Aarav Sharma",plate_number:"UP32 AB 1024",status:"Active",latitude:26.8467,longitude:80.9462,speed:42},
  {id:2,name:"Van 02",driver:"Priya Verma",plate_number:"UP32 CD 2088",status:"Active",latitude:26.8560,longitude:80.9350,speed:31},
  {id:3,name:"Truck 03",driver:"Rohan Singh",plate_number:"UP32 EF 3091",status:"On Delivery",latitude:26.8320,longitude:80.9580,speed:48},
  {id:4,name:"Van 04",driver:"Neha Gupta",plate_number:"UP32 GH 4012",status:"Maintenance",latitude:26.8650,longitude:80.9700,speed:0},
  {id:5,name:"Truck 05",driver:"Kabir Khan",plate_number:"UP32 JK 5099",status:"Active",latitude:26.8200,longitude:80.9300,speed:37}
];
const demoShipments = [
  {id:1,tracking_number:"FT-1001",customer:"Amit Traders",origin:"Lucknow Hub",destination:"Hazratganj",status:"In Transit",vehicle_id:1,estimated_delivery:"Tomorrow"},
  {id:2,tracking_number:"FT-1002",customer:"City Medicals",origin:"Lucknow Hub",destination:"Gomti Nagar",status:"Pending",vehicle_id:2,estimated_delivery:"Tomorrow"},
  {id:3,tracking_number:"FT-1003",customer:"Bright Electronics",origin:"Lucknow Hub",destination:"Aliganj",status:"Delivered",vehicle_id:3,estimated_delivery:"Today"},
  {id:4,tracking_number:"FT-1004",customer:"Fresh Mart",origin:"Lucknow Hub",destination:"Indira Nagar",status:"Delayed",vehicle_id:5,estimated_delivery:"Today"},
  {id:5,tracking_number:"FT-1005",customer:"Nova Fashion",origin:"Lucknow Hub",destination:"Charbagh",status:"In Transit",vehicle_id:1,estimated_delivery:"Today"},
  {id:6,tracking_number:"FT-1006",customer:"Green Foods",origin:"Lucknow Hub",destination:"Mahanagar",status:"Pending",vehicle_id:2,estimated_delivery:"Tomorrow"}
];

let pool = null;
let databaseEnabled = false;
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false
  });
  pool.query("SELECT 1").then(() => {
    databaseEnabled = true;
    console.log("Connected to PostgreSQL.");
  }).catch(err => console.warn("PostgreSQL unavailable; using demo memory data:", err.message));
} else {
  console.log("DATABASE_URL not set; using demo memory data.");
}

const asyncRoute = handler => (req,res,next) => Promise.resolve(handler(req,res,next)).catch(next);

app.get("/api/health", (req,res) => res.json({status:"ok",database:databaseEnabled ? "connected":"demo-mode"}));

app.get("/api/vehicles", asyncRoute(async (req,res) => {
  if (databaseEnabled) {
    const result = await pool.query("SELECT * FROM vehicles ORDER BY id");
    return res.json(result.rows);
  }
  res.json(demoVehicles);
}));

app.get("/api/shipments", asyncRoute(async (req,res) => {
  if (databaseEnabled) {
    const result = await pool.query("SELECT * FROM shipments ORDER BY id DESC");
    return res.json(result.rows);
  }
  res.json(demoShipments);
}));

app.get("/api/dashboard", asyncRoute(async (req,res) => {
  const vehicles = databaseEnabled ? (await pool.query("SELECT * FROM vehicles")).rows : demoVehicles;
  const shipments = databaseEnabled ? (await pool.query("SELECT * FROM shipments")).rows : demoShipments;
  const total = shipments.length;
  const delivered = shipments.filter(s => s.status === "Delivered").length;
  const inTransit = shipments.filter(s => s.status === "In Transit").length;
  const delayed = shipments.filter(s => s.status === "Delayed").length;
  res.json({
    totalVehicles: vehicles.length,
    activeVehicles: vehicles.filter(v => v.status === "Active" || v.status === "On Delivery").length,
    totalShipments: total,
    delivered,
    inTransit,
    delayed,
    deliveryRate: total ? Math.round(delivered / total * 100) : 0,
    vehicles,
    recentShipments: shipments.slice(-5).reverse()
  });
}));

app.patch("/api/shipments/:id/status", asyncRoute(async (req,res) => {
  const allowed = ["Pending","In Transit","Delivered","Delayed"];
  const { status } = req.body;
  if (!allowed.includes(status)) return res.status(400).json({message:"Invalid shipment status"});
  if (databaseEnabled) {
    const result = await pool.query(
      "UPDATE shipments SET status=$1 WHERE id=$2 RETURNING *", [status, req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({message:"Shipment not found"});
    return res.json(result.rows[0]);
  }
  const shipment = demoShipments.find(s => s.id === Number(req.params.id));
  if (!shipment) return res.status(404).json({message:"Shipment not found"});
  shipment.status = status;
  res.json(shipment);
}));

// Demo route optimizer: orders destinations by nearest straight-line distance.
app.post("/api/routes/optimize", (req,res) => {
  const { stops = [], start = {lat:26.8467,lng:80.9462} } = req.body;
  if (!Array.isArray(stops) || stops.length > 30) return res.status(400).json({message:"Provide up to 30 stops"});
  const remaining = [...stops];
  const ordered = [];
  let current = start;
  const distance = (a,b) => Math.sqrt(Math.pow(a.lat-b.lat,2) + Math.pow(a.lng-b.lng,2));
  while (remaining.length) {
    let bestIndex = 0;
    for (let i=1;i<remaining.length;i++) {
      if (distance(current,remaining[i]) < distance(current,remaining[bestIndex])) bestIndex=i;
    }
    const next = remaining.splice(bestIndex,1)[0];
    ordered.push(next);
    current = next;
  }
  res.json({ordered,method:"Nearest-neighbor straight-line estimate",note:"Demo only. This is not road-aware navigation."});
});

app.use((err,req,res,next) => {
  console.error(err);
  res.status(500).json({message:"Server error",detail:process.env.NODE_ENV === "development" ? err.message : undefined});
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`FleetTrack API running at http://localhost:${PORT}`));
