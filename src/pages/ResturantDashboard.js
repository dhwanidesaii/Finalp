import React, { useEffect, useMemo, useState } from 'react';
import { ordersAPI } from '../services/api';

const badge = (text, color) => (
	<span style={{
		background: color,
		color: '#fff',
		padding: '4px 10px',
		borderRadius: 999,
		fontSize: 12,
		fontWeight: 600
	}}>
		{text}
	</span>
);

const ResturantDashboard = () => {
	const [orders, setOrders] = useState([]);

	const today = new Date().toISOString().slice(0, 10);
	const totalToday = useMemo(() => orders.filter(o => o.date === today).length, [orders, today]);
	const totalLifetime = orders.length;
	const stats = useMemo(() => ({
		pending: orders.filter(o => o.status === 'Pending').length,
		accepted: orders.filter(o => o.status === 'Accepted').length,
		ready: orders.filter(o => o.status === 'Ready for Pickup').length,
		picked: orders.filter(o => o.status === 'Out for Delivery').length,
		delivered: orders.filter(o => o.status === 'Delivered').length
	}), [orders]);

	const updateStatusLocal = (id, nextStatus) => {
		setOrders(prev => prev.map(o => o.id === id ? { ...o, status: nextStatus } : o));
	};

	// accept order
	const acceptOrder = async (id) => {
		try {
			await ordersAPI.acceptByRestaurant(id);
			updateStatusLocal(id, 'Accepted');
		} catch (_) {}
	};

	// reject order
	const rejectOrder = async (id) => {
		try {
			await ordersAPI.rejectByRestaurant(id);
			updateStatusLocal(id, 'Cancelled');
		} catch (_) {}
	};

	// handle order confirmed event from SSE
	const onConfirmed = (e) => {
		try {
			const order = JSON.parse(e.data);
			updateStatusLocal(order.id, 'Accepted');
		} catch (_) {}
	};

	useEffect(() => {
		const base = (process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api');
		const ev = new EventSource(base + '/orders/events');

		const onCreated = (e) => {
			try {
				const order = JSON.parse(e.data);
				setOrders(prev => [{
					id: order.id,
					customerName: order.customerName,
					address: order.dropAddress,
					restaurantName: order.restaurantName,
					status: 'Pending',
					date: new Date().toISOString().slice(0, 10)
				}, ...prev]);
			} catch (_) {}
		};

		const onUpdated = (e) => {
			try {
				const order = JSON.parse(e.data);
				const mapped = order.status === 'out_for_delivery'
					? 'Out for Delivery'
					: order.status === 'pending_delivery' ? 'Accepted'
					: (order.status === 'delivered' ? 'Delivered' : 'Pending');
				updateStatusLocal(order.id, mapped);
			} catch (_) {}
		};

		const onAccepted = (e) => {
			try {
				const order = JSON.parse(e.data);
				updateStatusLocal(order.id, 'Accepted');
			} catch (_) {}
		};

		const onReadyForPickup = (e) => {
			try {
				const order = JSON.parse(e.data);
				updateStatusLocal(order.id, 'Ready for Pickup');
			} catch (_) {}
		};

		const onAssigned = (e) => {
			try {
				const order = JSON.parse(e.data);
				updateStatusLocal(order.id, 'Out for Delivery');
			} catch (_) {}
		};

		ev.addEventListener('order_created', onCreated);
		ev.addEventListener('order_updated', onUpdated);
		ev.addEventListener('order_confirmed', onConfirmed);
		ev.addEventListener('order_accepted', onAccepted);
		ev.addEventListener('order_ready', onReadyForPickup);
		ev.addEventListener('order_assigned', onAssigned);

		return () => {
			ev.removeEventListener('order_created', onCreated);
			ev.removeEventListener('order_updated', onUpdated);
			ev.removeEventListener('order_confirmed', onConfirmed);
			ev.removeEventListener('order_accepted', onAccepted);
			ev.removeEventListener('order_ready', onReadyForPickup);
			ev.removeEventListener('order_assigned', onAssigned);
			ev.close();
		};
	}, []);

	const pageStyle = {
		minHeight: '100vh',
		background: '#ff9f3f',
		padding: 24,
		fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif'
	};

	const cardStyle = { background: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' };

	return (
		<div style={pageStyle}>
			<div style={{ maxWidth: 1200, margin: '0 auto' }}>
				<header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
					<h2 style={{ color: '#fff', margin: 0 }}>CraveCart • Resturant Dashboard</h2>
					<input placeholder="Search orders…" style={{ width: 320, borderRadius: 12, border: 'none', padding: '10px 14px' }} />
				</header>

				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
					<div style={cardStyle}>
						<div style={{ color: '#6b7280', fontSize: 12, fontWeight: 600 }}>Total Today</div>
						<div style={{ fontSize: 28, fontWeight: 800 }}>{totalToday}</div>
					</div>
					<div style={cardStyle}>
						<div style={{ color: '#6b7280', fontSize: 12, fontWeight: 600 }}>Total Lifetime</div>
						<div style={{ fontSize: 28, fontWeight: 800 }}>{totalLifetime}</div>
					</div>
					<div style={cardStyle}>
						<div style={{ fontWeight: 700, marginBottom: 8 }}>Order Status</div>
						<div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
							<span style={{ width: 10, height: 10, background: '#16a34a', borderRadius: 999 }} />
							<span style={{ fontSize: 12, color: '#374151' }}>Delivered: {stats.delivered}</span>
						</div>
						<div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
							<span style={{ width: 10, height: 10, background: '#3b82f6', borderRadius: 999 }} />
							<span style={{ fontSize: 12, color: '#374151' }}>Out for Delivery: {stats.picked}</span>
						</div>
						<div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
							<span style={{ width: 10, height: 10, background: '#10b981', borderRadius: 999 }} />
							<span style={{ fontSize: 12, color: '#374151' }}>Ready for Pickup: {stats.ready}</span>
						</div>
						<div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
							<span style={{ width: 10, height: 10, background: '#8b5cf6', borderRadius: 999 }} />
							<span style={{ fontSize: 12, color: '#374151' }}>Accepted: {stats.accepted}</span>
						</div>
						<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
							<span style={{ width: 10, height: 10, background: '#f59e0b', borderRadius: 999 }} />
							<span style={{ fontSize: 12, color: '#374151' }}>Pending: {stats.pending}</span>
						</div>
					</div>
				</div>

				<section style={{ marginTop: 24 }}>
					<div style={{ ...cardStyle, overflow: 'hidden' }}>
						<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
							<h3 style={{ margin: 0 }}>Live Orders</h3>
							<div style={{ display: 'flex', gap: 8 }}>
								{badge('Today ' + totalToday, '#0ea5e9')}
								{badge('Lifetime ' + totalLifetime, '#ef4444')}
							</div>
						</div>
						<div style={{ width: '100%', overflowX: 'auto' }}>
							<table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
								<thead>
									<tr style={{ textAlign: 'left', color: '#6b7280', fontSize: 12 }}>
										<th style={{ padding: '12px 8px' }}>Order ID</th>
										<th style={{ padding: '12px 8px' }}>Customer</th>
										<th style={{ padding: '12px 8px' }}>Address</th>
										<th style={{ padding: '12px 8px' }}>Resturant</th>
										<th style={{ padding: '12px 8px' }}>Status</th>
										<th style={{ padding: '12px 8px' }}>Actions</th>
									</tr>
								</thead>
								<tbody>
									{orders.map((o, idx) => (
										<tr key={o.id} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
											<td style={{ padding: '12px 8px', fontWeight: 600 }}>{o.id}</td>
											<td style={{ padding: '12px 8px' }}>{o.customerName}</td>
											<td style={{ padding: '12px 8px' }}>{o.address}</td>
											<td style={{ padding: '12px 8px' }}>{o.restaurantName}</td>
											<td style={{ padding: '12px 8px' }}>
												{badge(o.status, 
													o.status === 'Delivered' ? '#16a34a' : 
													o.status === 'Out for Delivery' ? '#3b82f6' : 
													o.status === 'Ready for Pickup' ? '#10b981' :
													o.status === 'Accepted' ? '#8b5cf6' :
													o.status === 'Cancelled' ? '#ef4444' :
													'#f59e0b'
												)}
											</td>
											<td style={{ padding: '12px 8px' }}>
												<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
													{o.status === 'Pending' && (
														<>
															<button
																onClick={() => acceptOrder(o.id)}
																style={{
																	padding: '6px 12px',
																	borderRadius: 8,
																	border: 'none',
																	fontWeight: 600,
																	fontSize: '12px',
																	background: '#10b981',
																	color: '#fff',
																	cursor: 'pointer'
																}}
															>
																Accept
															</button>
															<button
																onClick={() => rejectOrder(o.id)}
																style={{
																	padding: '6px 12px',
																	borderRadius: 8,
																	border: 'none',
																	fontWeight: 600,
																	fontSize: '12px',
																	background: '#ef4444',
																	color: '#fff',
																	cursor: 'pointer'
																}}
															>
																Reject
															</button>
														</>
													)}
													{o.status === 'Accepted' && (
														<button
															onClick={() => updateStatusLocal(o.id, 'Delivered')}
															style={{
																padding: '6px 12px',
																borderRadius: 8,
																border: 'none',
																fontWeight: 700,
																background: '#16a34a',
																color: '#fff',
																cursor: 'pointer',
																opacity: o.status === 'Accepted' ? 1 : 0.5
															}}
															disabled={o.status !== 'Accepted'}
														>
															Delivered
														</button>
													)}
													{['Ready for Pickup', 'Out for Delivery', 'Delivered', 'Cancelled'].includes(o.status) && (
														<span style={{ 
															padding: '6px 12px', 
															color: '#6b7280', 
															fontSize: '12px',
															fontStyle: 'italic'
														}}>No actions available</span>
													)}
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				</section>
			</div>
		</div>
	);
};

export default ResturantDashboard;
