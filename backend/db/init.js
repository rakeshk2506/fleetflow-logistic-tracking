
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing. Copy .env.example to .env and configure it.");
  process.exit(1);
}
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false
});

async function init() {
  try {
    const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
    await pool.query(schema);
    const count = await pool.query("SELECT COUNT(*)::int AS count FROM vehicles");
    if (count.rows[0].count === 0) {
      const vehicles = [
        ["Truck 01","Aarav Sharma","UP32 AB 1024","Active",26.8467,80.9462,42],
        ["Van 02","Priya Verma","UP32 CD 2088","Active",26.8560,80.9350,31],
        ["Truck 03","Rohan Singh","UP32 EF 3091","On Delivery",26.8320,80.9580,48],
        ["Van 04","Neha Gupta","UP32 GH 4012","Maintenance",26.8650,80.9700,0],
        ["Truck 05","Kabir Khan","UP32 JK 5099","Active",26.8200,80.9300,37]
      ];
      for (const v of vehicles) {
        await pool.query(
          "INSERT INTO vehicles(name,driver,plate_number,status,latitude,longitude,speed) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(plate_number) DO NOTHING", v
        );
      }
      const ids = await pool.query("SELECT id FROM vehicles ORDER BY id");
      const shipments = [
        ["FT-1001","Amit Traders","Lucknow Hub","Hazratganj","In Transit",ids.rows[0]?.id],
        ["FT-1002","City Medicals","Lucknow Hub","Gomti Nagar","Pending",ids.rows[1]?.id],
        ["FT-1003","Bright Electronics","Lucknow Hub","Aliganj","Delivered",ids.rows[2]?.id],
        ["FT-1004","Fresh Mart","Lucknow Hub","Indira Nagar","Delayed",ids.rows[4]?.id],
        ["FT-1005","Nova Fashion","Lucknow Hub","Charbagh","In Transit",ids.rows[0]?.id],
        ["FT-1006","Green Foods","Lucknow Hub","Mahanagar","Pending",ids.rows[1]?.id]
      ];
      for (const s of shipments) {
        await pool.query(
          "INSERT INTO shipments(tracking_number,customer,origin,destination,status,vehicle_id,estimated_delivery) VALUES($1,$2,$3,$4,$5,$6,CURRENT_DATE + INTERVAL '1 day') ON CONFLICT(tracking_number) DO NOTHING", s
        );
      }
    }
    console.log("Database schema and demo data are ready.");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
init();
