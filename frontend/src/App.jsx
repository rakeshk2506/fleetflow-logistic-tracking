import React, { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, ArrowDownRight, ArrowUpRight, Bell, CheckCircle2, Clock3, LayoutDashboard, MapPin, Menu, Package, Route, Search, Settings, Truck, Users, X } from 'lucide-react'
import api from './api'
import { sampleShipments, sampleVehicles } from './data'

const navItems = [
  {id:'overview',label:'Overview',icon:LayoutDashboard},
  {id:'tracking',label:'Live Tracking',icon:MapPin},
  {id:'shipments',label:'Shipments',icon:Package},
  {id:'vehicles',label:'Vehicles',icon:Truck},
  {id:'routes',label:'Route Planner',icon:Route},
  {id:'analytics',label:'Analytics',icon:Activity}
]
const fallbackChart = [{day:'Mon',deliveries:18},{day:'Tue',deliveries:24},{day:'Wed',deliveries:20},{day:'Thu',deliveries:31},{day:'Fri',deliveries:27},{day:'Sat',deliveries:35},{day:'Sun',deliveries:29}]
const destinationPoints = [
  {name:'Hazratganj',lat:26.8500,lng:80.9462},
  {name:'Gomti Nagar',lat:26.8550,lng:81.0000},
  {name:'Aliganj',lat:26.8900,lng:80.9400},
  {name:'Indira Nagar',lat:26.8750,lng:80.9900},
  {name:'Charbagh',lat:26.8310,lng:80.9220},
  {name:'Mahanagar',lat:26.8750,lng:80.9500}
]
const markerIcon = new L.DivIcon({
  className:'vehicle-marker-wrap',
  html:'<div class="vehicle-marker"><span></span></div>',
  iconSize:[24,24],iconAnchor:[12,12]
})

function Status({value}) {
  const cls = value === 'Delivered' || value === 'Active' ? 'green' : value === 'Delayed' || value === 'Maintenance' ? 'red' : value === 'Pending' ? 'amber' : 'blue'
  return <span className={`status ${cls}`}><i />{value}</span>
}
function Metric({label,value,change,icon:Icon,tone}) {
  return <div className="metric-card"><div className={`metric-icon ${tone}`}><Icon size={19}/></div><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-change"><ArrowUpRight size={14}/>{change}</div></div>
}
function App() {
  const [page,setPage] = useState('overview')
  const [vehicles,setVehicles] = useState(sampleVehicles)
  const [shipments,setShipments] = useState(sampleShipments)
  const [dbMode,setDbMode] = useState('demo-mode')
  const [search,setSearch] = useState('')
  const [mobileOpen,setMobileOpen] = useState(false)
  const [routeResult,setRouteResult] = useState(null)
  const [selectedStops,setSelectedStops] = useState(destinationPoints.slice(0,4).map(p=>p.name))
  const [notice,setNotice] = useState('')

  async function refresh() {
    try {
      const [v,s,h] = await Promise.all([api.get('/vehicles'),api.get('/shipments'),api.get('/health')])
      setVehicles(v.data); setShipments(s.data); setDbMode(h.data.database)
    } catch {
      setDbMode('demo-mode')
    }
  }
  useEffect(() => { refresh() }, [])
  useEffect(() => {
    const timer = setInterval(() => {
      setVehicles(current => current.map(v => {
        if (v.status === 'Maintenance') return v
        const shift = () => (Math.random() - .48) * .0008
        return {...v,latitude:v.latitude+shift(),longitude:v.longitude+shift(),speed:Math.max(18,Math.min(65,v.speed+Math.round((Math.random()-.5)*6)))}
      }))
    },3000)
    return () => clearInterval(timer)
  }, [])

  const delivered = shipments.filter(s=>s.status==='Delivered').length
  const inTransit = shipments.filter(s=>s.status==='In Transit').length
  const delayed = shipments.filter(s=>s.status==='Delayed').length
  const activeVehicles = vehicles.filter(v=>v.status==='Active'||v.status==='On Delivery').length
  const filteredShipments = useMemo(()=>shipments.filter(s=>[s.tracking_number,s.customer,s.destination,s.status].join(' ').toLowerCase().includes(search.toLowerCase())),[shipments,search])

  async function updateStatus(id,status) {
    try {
      const response = await api.patch(`/shipments/${id}/status`,{status})
      setShipments(old=>old.map(s=>s.id===id?response.data:s))
      setNotice(`Shipment updated to ${status}`)
    } catch {
      setShipments(old=>old.map(s=>s.id===id?{...s,status}:s))
      setNotice('Updated locally. Start the backend to save changes.')
    }
    setTimeout(()=>setNotice(''),3000)
  }
  async function optimizeRoute() {
    const stops = destinationPoints.filter(p=>selectedStops.includes(p.name))
    try {
      const response = await api.post('/routes/optimize',{stops,start:{lat:26.8467,lng:80.9462}})
      setRouteResult(response.data)
    } catch {
      setRouteResult({ordered:stops,method:'Local nearest-neighbor demo',note:'Backend unavailable; showing the selected stops in their current order.'})
    }
  }

  const title = navItems.find(n=>n.id===page)?.label || 'Overview'
  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen?'open':''}`}>
      <div className="brand"><div className="brand-mark"><Truck size={21}/></div><div><b>FleetTrack</b><small>LOGISTICS CONTROL</small></div><button className="mobile-close" onClick={()=>setMobileOpen(false)}><X size={18}/></button></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav>{navItems.map(item=><button key={item.id} className={`nav-item ${page===item.id?'active':''}`} onClick={()=>{setPage(item.id);setMobileOpen(false)}}><item.icon size={18}/><span>{item.label}</span>{item.id==='shipments'&&<em>{shipments.length}</em>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><Users size={17}/></div><b>Need assistance?</b><p>Check your fleet operations and shipment status.</p><button onClick={()=>setNotice('FleetTrack demo support: check the README for setup help.')}>View help center</button></div><button className="nav-item"><Settings size={18}/><span>Settings</span></button><div className="profile"><div className="avatar">AD</div><div><b>Admin User</b><small>Fleet Administrator</small></div><span className="profile-dots">•••</span></div></div>
    </aside>
    {mobileOpen&&<div className="scrim" onClick={()=>setMobileOpen(false)}/>}
    <main className="main-area">
      <header className="topbar"><div className="topbar-left"><button className="menu-button" onClick={()=>setMobileOpen(true)}><Menu/></button><div><div className="breadcrumb">Workspace <span>/</span> {title}</div><h1>{title}</h1></div></div><div className="topbar-actions"><div className="system-status"><span/> System operational</div><button className="icon-button" aria-label="Notifications" onClick={()=>setNotice('You are all caught up!')}><Bell size={18}/><i/></button><div className="top-avatar">AD</div></div></header>
      <div className="content">
        {notice&&<div className="toast"><CheckCircle2 size={17}/>{notice}<button onClick={()=>setNotice('')}><X size={15}/></button></div>}
        {page==='overview'&&<><div className="welcome-row"><div><h2>Good morning, Admin <span>✦</span></h2><p>Here’s what’s happening with your fleet today.</p></div><div className="date-chip"><Clock3 size={15}/> Live overview</div></div>
          <div className="metrics-grid">
            <Metric label="Total vehicles" value={vehicles.length} change="Fleet registered" icon={Truck} tone="purple"/>
            <Metric label="Active vehicles" value={activeVehicles} change="Currently on road" icon={Activity} tone="blue"/>
            <Metric label="Total shipments" value={shipments.length} change="All shipment records" icon={Package} tone="orange"/>
            <Metric label="Delivered orders" value={delivered} change={`${shipments.length?Math.round(delivered/shipments.length*100):0}% completion rate`} icon={CheckCircle2} tone="green"/>
          </div>
          <div className="overview-grid"><section className="panel map-panel"><div className="panel-heading"><div><h3>Live fleet locations</h3><p>Vehicle positions update automatically in demo mode</p></div><button className="text-button" onClick={()=>setPage('tracking')}>View full map ↗</button></div><FleetMap vehicles={vehicles} compact/></section>
            <section className="panel"><div className="panel-heading"><div><h3>Shipment overview</h3><p>Current delivery distribution</p></div><span className="muted-tag">Today</span></div><div className="shipment-summary"><div className="summary-total"><b>{shipments.length}</b><span>Total shipments</span></div>{[['Delivered',delivered,'green'],['In Transit',inTransit,'blue'],['Pending',shipments.filter(s=>s.status==='Pending').length,'amber'],['Delayed',delayed,'red']].map(([label,value,color])=><div className="summary-row" key={label}><span><i className={`dot ${color}`}/>{label}</span><b>{value}</b></div>)}</div></section>
          </div>
          <div className="bottom-grid"><section className="panel chart-panel"><div className="panel-heading"><div><h3>Delivery performance</h3><p>Illustrative weekly delivery volume</p></div><span className="muted-tag">This week</span></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={fallbackChart}><defs><linearGradient id="deliveryFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6b69e8" stopOpacity={.25}/><stop offset="100%" stopColor="#6b69e8" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf0f5"/><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize:11,fill:'#9299a8'}}/><YAxis axisLine={false} tickLine={false} tick={{fontSize:11,fill:'#9299a8'}}/><Tooltip/><Area type="monotone" dataKey="deliveries" stroke="#6967df" strokeWidth={2.5} fill="url(#deliveryFill)"/></AreaChart></ResponsiveContainer></div></section>
            <section className="panel"><div className="panel-heading"><div><h3>Recent shipments</h3><p>Latest shipment activity</p></div><button className="text-button" onClick={()=>setPage('shipments')}>View all ↗</button></div><div className="mini-list">{shipments.slice(0,4).map(s=><div className="mini-shipment" key={s.id}><div className="shipment-icon"><Package size={16}/></div><div className="mini-info"><b>{s.tracking_number}</b><small>{s.destination}</small></div><Status value={s.status}/></div>)}</div></section>
          </div>
        </>}
        {page==='tracking'&&<><div className="page-intro"><div><h2>Track your fleet in real time</h2><p>Monitor vehicle locations and operating status across the delivery network.</p></div><span className="live-pill"><i/> LIVE SIMULATION</span></div><div className="panel full-map-panel"><div className="panel-heading"><div><h3>Fleet map · Lucknow, India</h3><p>{activeVehicles} active vehicles reporting location</p></div><span className="muted-tag">Auto refresh · 3 sec</span></div><FleetMap vehicles={vehicles}/></div><div className="panel table-panel"><PanelTitle title="Vehicles on the map" subtitle="Current vehicle telemetry"/><VehicleTable vehicles={vehicles}/></div></>}
        {page==='vehicles'&&<><div className="page-intro"><div><h2>Vehicle management</h2><p>Monitor your registered fleet and driver information.</p></div><span className="muted-tag">{vehicles.length} vehicles</span></div><div className="panel table-panel"><VehicleTable vehicles={vehicles}/></div></>}
        {page==='shipments'&&<><div className="page-intro"><div><h2>Shipment management</h2><p>Search shipments and update delivery progress.</p></div><div className="search-box"><Search size={16}/><input placeholder="Search shipment..." value={search} onChange={e=>setSearch(e.target.value)}/></div></div><div className="panel table-panel"><div className="table-top"><PanelTitle title="All shipments" subtitle={`${filteredShipments.length} records found`}/></div><div className="table-scroll"><table><thead><tr><th>TRACKING ID</th><th>CUSTOMER</th><th>DESTINATION</th><th>VEHICLE</th><th>STATUS</th><th>UPDATE STATUS</th></tr></thead><tbody>{filteredShipments.map(s=><tr key={s.id}><td><b className="tracking-id">{s.tracking_number}</b></td><td>{s.customer}</td><td>{s.destination}</td><td>#{s.vehicle_id||'—'}</td><td><Status value={s.status}/></td><td><select className="status-select" value={s.status} onChange={e=>updateStatus(s.id,e.target.value)}><option>Pending</option><option>In Transit</option><option>Delivered</option><option>Delayed</option></select></td></tr>)}</tbody></table>{filteredShipments.length===0&&<div className="empty-state">No shipments match your search.</div>}</div></div></>}
        {page==='routes'&&<><div className="page-intro"><div><h2>Route planner</h2><p>Arrange delivery stops using a nearest-neighbor route estimate.</p></div><button className="primary-button" onClick={optimizeRoute}><Route size={16}/> Optimize route</button></div><div className="route-layout"><section className="panel"><PanelTitle title="Choose delivery stops" subtitle="Select destinations to include in the route"/><div className="stop-list">{destinationPoints.map(p=><label key={p.name} className="stop-option"><input type="checkbox" checked={selectedStops.includes(p.name)} onChange={e=>setSelectedStops(old=>e.target.checked?[...old,p.name]:old.filter(n=>n!==p.name))}/><span><b>{p.name}</b><small>Lucknow delivery zone</small></span></label>)}</div><button className="primary-button wide" onClick={optimizeRoute}>Calculate best order <ArrowUpRight size={16}/></button></section><section className="panel"><PanelTitle title="Suggested route" subtitle="Starting point: Lucknow Hub"/>{routeResult?<><div className="route-result"><div className="route-line"><span className="route-start">H</span><div><b>Lucknow Hub</b><small>Starting location</small></div></div>{routeResult.ordered.map((stop,i)=><div className="route-line" key={stop.name}><span className="route-number">{i+1}</span><div><b>{stop.name}</b><small>Stop {i+1}</small></div></div>)}</div><p className="route-note">{routeResult.method}. {routeResult.note}</p></>:<div className="empty-route"><Route size={30}/><b>Your optimized route will appear here</b><span>Select stops and calculate their suggested order.</span></div>}</section></div></>}
        {page==='analytics'&&<><div className="page-intro"><div><h2>Fleet analytics</h2><p>Understand fleet utilization and delivery performance.</p></div><span className="muted-tag">Demo report</span></div><div className="metrics-grid analytics-metrics"><Metric label="Delivery rate" value={`${shipments.length?Math.round(delivered/shipments.length*100):0}%`} change="Based on current records" icon={CheckCircle2} tone="green"/><Metric label="In transit" value={inTransit} change="Shipments on the move" icon={Truck} tone="blue"/><Metric label="Delayed" value={delayed} change="Needs attention" icon={Clock3} tone="orange"/><Metric label="Fleet utilization" value={`${vehicles.length?Math.round(activeVehicles/vehicles.length*100):0}%`} change="Active / total vehicles" icon={Activity} tone="purple"/></div><div className="analytics-grid"><section className="panel chart-panel"><PanelTitle title="Weekly delivery volume" subtitle="Sample weekly data for demonstration"/><div className="chart-wrap tall"><ResponsiveContainer width="100%" height="100%"><BarChart data={fallbackChart}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf0f5"/><XAxis dataKey="day" axisLine={false} tickLine={false}/><YAxis axisLine={false} tickLine={false}/><Tooltip/><Bar dataKey="deliveries" fill="#6b69df" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div></section><section className="panel"><PanelTitle title="Shipment status" subtitle="Current shipment distribution"/><div className="analytics-status">{[['Delivered',delivered,'green'],['In Transit',inTransit,'blue'],['Pending',shipments.filter(s=>s.status==='Pending').length,'amber'],['Delayed',delayed,'red']].map(([name,value,color])=><div key={name}><div className="analytics-status-label"><span><i className={`dot ${color}`}/>{name}</span><b>{value}</b></div><div className="progress-track"><span className={color} style={{width:`${shipments.length?value/shipments.length*100:0}%`}}/></div></div>)}</div></section></div></>}
        <footer className="footer"><span>© 2026 FleetTrack · Summer Training Project</span><span>Built with React, Node.js & PostgreSQL</span></footer>
      </div>
    </main>
  </div>
}

function PanelTitle({title,subtitle}) { return <div className="panel-heading"><div><h3>{title}</h3><p>{subtitle}</p></div></div> }
function VehicleTable({vehicles}) {
  return <div className="table-scroll"><table><thead><tr><th>VEHICLE</th><th>DRIVER</th><th>PLATE NUMBER</th><th>SPEED</th><th>STATUS</th></tr></thead><tbody>{vehicles.map(v=><tr key={v.id}><td><div className="vehicle-name"><span className="vehicle-table-icon"><Truck size={16}/></span><b>{v.name}</b></div></td><td>{v.driver}</td><td>{v.plate_number}</td><td>{v.speed} km/h</td><td><Status value={v.status}/></td></tr>)}</tbody></table></div>
}
function FleetMap({vehicles,compact=false}) {
  const center=[26.8467,80.9462]
  return <div className={`map-wrap ${compact?'compact':''}`}><MapContainer center={center} zoom={compact?12:12} scrollWheelZoom={!compact} style={{height:'100%',width:'100%'}}><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>{vehicles.filter(v=>v.status!=='Maintenance').map(v=><Marker key={v.id} position={[v.latitude,v.longitude]} icon={markerIcon}><Popup><b>{v.name}</b><br/>{v.driver}<br/>{v.speed} km/h · {v.status}</Popup></Marker>)}</MapContainer></div>
}
export default App
