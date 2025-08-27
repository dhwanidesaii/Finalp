import React, { useEffect, useMemo, useState } from 'react';
import { ordersAPI } from '../services/api';
import './AdminDashboard.css';

export default function AdminDashboard() {
	const [orders, setOrders] = useState([]);
	const [filter, setFilter] = useState('pending_delivery');

	// Load existing orders on mount so the table isn't empty if admin opens late
	useEffect(() => {
		let alive = true;
		(async () => {
			try {
				const list = await ordersAPI.getAll();
				if (alive && Array.isArray(list)) {
					setOrders(prev => {
						// Merge unique by id, prefer newest from server
						const map = new Map();
						[...list, ...prev].forEach(o => map.set(o.id, o));
						return Array.from(map.values());
					});
				}
			} catch (_) {}
		})();
		return () => { alive = false; };
	}, []);

	useEffect(() => {
		const base = (process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api');
		const ev = new EventSource(base + '/orders/events');
		const upsert = (order) => {
			setOrders(prev => {
				const idx = prev.findIndex(o => o.id === order.id);
				if (idx === -1) return [order, ...prev];
				const copy = [...prev];
				copy[idx] = { ...copy[idx], ...order };
				return copy;
			});
		};
		ev.addEventListener('order_created', e => { try { upsert(JSON.parse(e.data)); } catch(_){} });
		ev.addEventListener('order_updated', e => { try { upsert(JSON.parse(e.data)); } catch(_){} });
		ev.addEventListener('order_accepted', e => { try { upsert(JSON.parse(e.data)); } catch(_){} });
		ev.addEventListener('order_ready_for_pickup', e => { try { upsert(JSON.parse(e.data)); } catch(_){} });
		ev.addEventListener('order_ready', e => { try { upsert(JSON.parse(e.data)); } catch(_){} });
		ev.addEventListener('order_assigned', e => { try { upsert(JSON.parse(e.data)); } catch(_){} });
		ev.addEventListener('order_reassigned', e => { try { upsert(JSON.parse(e.data)); } catch(_){} });
		return () => ev.close();
	}, []);

	const filtered = useMemo(() => orders.filter(o => filter === 'all' ? true : o.status === filter), [orders, filter]);

	const total = orders.length;
	const totalPending = orders.filter(o => o.status === 'pending' || o.status === 'pending_delivery').length;
	const totalAccepted = orders.filter(o => o.status === 'accepted' || o.status === 'accepted_delivery').length;
	const totalReady = orders.filter(o => o.status === 'ready_for_pickup').length;
	const totalAssigned = orders.filter(o => o.status === 'out_for_delivery').length;
	const totalDelivered = orders.filter(o => o.status === 'delivered').length;
	const totalCancelled = orders.filter(o => o.status === 'cancelled' || o.status === 'rejected').length;
	const todayIso = new Date().toISOString().slice(0,10);
	const earningsToday = orders
		.filter(o => o.status === 'delivered' && (o.createdAt ? String(o.createdAt).slice(0,10) === todayIso : true))
		.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

	const acceptOrder = async (id) => { await ordersAPI.acceptByRestaurant(id); };
	const markReady = async (id) => { await ordersAPI.markReadyForPickup(id); };
	const cancel = async (id) => { await ordersAPI.rejectByRestaurant(id); };
	const markDelivered = async (id) => { await ordersAPI.updateStatus(id, 'delivered'); };
	const reassign = async (id) => {
		const name = prompt('Enter driver name');
		await ordersAPI.reassignDriver(id, { driverName: name || 'Reassigned Driver' });
	};

	const statusBadge = (s) => (
		<span className={`badge ${s==='pending' || s==='pending_delivery' ? 'b-pending' : s==='confirmed' ? 'b-confirmed' : s==='accepted_delivery' ? 'b-confirmed' : s==='out_for_delivery' ? 'b-assigned' : s==='delivered' ? 'b-delivered' : 'b-cancelled'}`}>{
			s==='pending_delivery' ? 'Pending Delivery' : s==='accepted_delivery' ? 'Accepted by Delivery' : s==='pending' ? 'Placed' : s==='confirmed' ? 'Accepted' : s==='out_for_delivery' ? 'Assigned' : s==='delivered' ? 'Delivered' : 'Cancelled'
		}</span>
	);

	return (
		<div className="admin-page">
			<div className="admin-header">
				<h2 className="admin-title">Admin Dashboard</h2>
				<div className="admin-filters">
					<select value={filter} onChange={e => setFilter(e.target.value)}>
						<option value="all">All</option>
						<option value="pending_delivery">Pending Delivery</option>
						<option value="pending">Placed</option>
						<option value="confirmed">Accepted by Restaurant</option>
						<option value="accepted_delivery">Accepted by Delivery</option>
						<option value="out_for_delivery">Assigned to Delivery</option>
						<option value="delivered">Completed</option>
						<option value="cancelled">Cancelled</option>
					</select>
				</div>
			</div>

			<div className="admin-kpis">
				<div className="kpi-card"><div className="kpi-title">Total Orders</div><div className="kpi-value">{total}</div></div>
				<div className="kpi-card"><div className="kpi-title">Pending</div><div className="kpi-value">{totalPending}</div></div>
				<div className="kpi-card"><div className="kpi-title">Accepted</div><div className="kpi-value">{totalAccepted}</div></div>
				<div className="kpi-card"><div className="kpi-title">Ready</div><div className="kpi-value">{totalReady}</div></div>
				<div className="kpi-card"><div className="kpi-title">Out for Delivery</div><div className="kpi-value">{totalAssigned}</div></div>
				<div className="kpi-card"><div className="kpi-title">Delivered</div><div className="kpi-value">{totalDelivered}</div></div>
				<div className="kpi-card"><div className="kpi-title">Cancelled</div><div className="kpi-value">{totalCancelled}</div></div>
				<div className="kpi-card"><div className="kpi-title">Earnings Today (₹)</div><div className="kpi-value">{earningsToday}</div></div>
			</div>

			<div className="admin-card">
				<table className="admin-table">
					<thead>
						<tr>
							<th className="admin-th">Order</th>
							<th className="admin-th">Restaurant</th>
							<th className="admin-th">Items</th>
							<th className="admin-th">Address</th>
							<th className="admin-th">Status</th>
							<th className="admin-th">Actions</th>
						</tr>
					</thead>
					<tbody>
						{filtered.map(o => (
							<tr className="admin-row" key={o.id}>
								<td className="admin-td">{o.id}</td>
								<td className="admin-td">{o.restaurantName || o.restaurantId}</td>
								<td className="admin-td">{(o.items || []).map(i => `${i.name} x${i.quantity}`).join(', ')}</td>
								<td className="admin-td">{typeof o.deliveryAddress === 'string' ? o.deliveryAddress : [o.deliveryAddress?.street, o.deliveryAddress?.city].filter(Boolean).join(', ')}</td>
								<td className="admin-td">{statusBadge(o.status)}</td>
								<td className="admin-td">
									<div className="admin-actions">
										{o.status === 'pending' && (
											<>
												<button className="btn btn-accept" onClick={() => acceptOrder(o.id)}>Accept</button>
												<button className="btn btn-cancel" onClick={() => cancel(o.id)}>Reject</button>
											</>
										)}
										{o.status === 'accepted' && (
											<button className="btn btn-ready" onClick={() => markReady(o.id)}>Mark Ready</button>
										)}
										{o.status === 'out_for_delivery' && (
											<>
												<button className="btn btn-reassign" onClick={() => reassign(o.id)}>Reassign</button>
												<button className="btn btn-delivered" onClick={() => markDelivered(o.id)}>Mark Delivered</button>
											</>
										)}
										{['ready_for_pickup', 'delivered', 'cancelled'].includes(o.status) && (
											<span style={{ color: '#6b7280', fontSize: '12px', fontStyle: 'italic' }}>No actions available</span>
										)}
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}