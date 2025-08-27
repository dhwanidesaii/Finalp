// src/pages/SplitUpiCollectionPage.js

import React, { useState, useContext, useEffect } from "react";
import { CartContext } from "../context/CartContext";
import { useNavigate } from "react-router-dom";
import "./PaymentPage.css"; // Reusing the same styles
import { ordersAPI } from "../services/api";

const SplitUpiCollectionPage = () => {
  const { 
    cartItems, 
    calculateTotal, 
    manualSplitData,
    getManualSplitSummary,
    splitBillType,
    splitBillCount,
    calculateSplitAmount,
    clearCart 
  } = useContext(CartContext);
  
  const navigate = useNavigate();
  const [splitUpiIds, setSplitUpiIds] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const totalAmount = calculateTotal();
  const splitAmount = calculateSplitAmount();
  // manualSplitSummary not needed directly in this component

  useEffect(() => {
    // If cart is empty or split bill not enabled, redirect
    if (cartItems.length === 0) {
      navigate('/');
      return;
    }

    // Initialize UPI IDs based on split type
    if (splitBillType === 'manual') {
      const initialUpiIds = {};
      manualSplitData.forEach((person, index) => {
        if (person.name.trim()) {
          initialUpiIds[index] = '';
        }
      });
      setSplitUpiIds(initialUpiIds);
    } else if (splitBillType === 'equal') {
      // For equal split, create generic person entries
      const initialUpiIds = {};
      for (let i = 0; i < splitBillCount; i++) {
        initialUpiIds[i] = '';
      }
      setSplitUpiIds(initialUpiIds);
    }
  }, [cartItems, navigate, splitBillType, manualSplitData, splitBillCount]);

  const handleUpiIdChange = (personIndex, upiId) => {
    setSplitUpiIds(prev => ({
      ...prev,
      [personIndex]: upiId
    }));
  };

  const processAllPayments = () => {
    // Validate all UPI IDs are filled
    const requiredCount = splitBillType === 'manual' 
      ? manualSplitData.filter(p => p.name.trim()).length 
      : splitBillCount;

    const filledUpiIds = Object.values(splitUpiIds).filter(id => id.trim()).length;
    
    if (filledUpiIds < requiredCount) {
      alert('Please enter UPI IDs for all members');
      return;
    }

    setIsProcessing(true);

    // Simulate processing payments for all members
    setTimeout(async () => {
      try {
        // Create a single backend order after all split payments succeed
        const orderPayload = {
          items: cartItems.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
          deliveryAddress: 'Customer address',
          paymentMethod: 'upi',
          paymentStatus: 'paid',
          restaurantId: cartItems[0]?.restaurantId || 'demo-restaurant',
          restaurantName: cartItems[0]?.restaurantName || 'Demo Restaurant',
          pickupAddress: cartItems[0]?.restaurantAddress || 'Pickup Location'
        };
        await ordersAPI.create(orderPayload);
      } catch (_) {
        // Non-blocking for UI success flow
      }

      setIsProcessing(false);
      setShowSuccess(true);

      // Clear cart after successful payment
      setTimeout(() => {
        clearCart();
      }, 3000);
    }, 3000);
  };

  const goBack = () => {
    navigate('/payment');
  };

  const goHome = () => {
    navigate('/');
  };

  if (showSuccess) {
    const paymentDetails = splitBillType === 'manual' 
      ? manualSplitData
          .map((person, index) => {
            if (!person.name.trim()) return null;
            return `${person.name}: ₹${person.amount} → ${splitUpiIds[index]}`;
          })
          .filter(Boolean)
          .join('\n')
      : Array.from({ length: splitBillCount }, (_, index) => 
          `Person ${index + 1}: ₹${splitAmount} → ${splitUpiIds[index]}`
        ).join('\n');

    return (
      <div className="payment-container">
        <div className="payment-card">
          <div className="logo">
            <div className="logo-icon">🍔</div>
            <span className="logo-text">FoodDelivery</span>
          </div>
          <div className="success-message">
            <div className="success-icon">✅</div>
            <h2>All Split Payments Successful!</h2>
            <p style={{ whiteSpace: 'pre-line', marginBottom: '20px' }}>
              {paymentDetails}
            </p>
            <button className="primary-btn" onClick={goHome}>
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-container">
      <div className="payment-card">
        <div className="logo">
          <div className="logo-icon">🍔</div>
          <span className="logo-text">FoodDelivery</span>
        </div>
        
        <h1 className="main-heading">Split Payment UPI Collection</h1>
        <p className="sub-text">Enter UPI IDs for all split payment members</p>
        
        <div className="order-summary">
          <h2>Order Summary</h2>
          {cartItems.map((item, index) => (
            <div key={index} className="order-item">
              <span>{item.name} x{item.quantity}</span>
              <span>₹{item.price * item.quantity}</span>
            </div>
          ))}
          <div className="order-total">
            <span>Total</span>
            <span>₹{totalAmount}</span>
          </div>
        </div>

        <div className="split-info-card">
          <h3 style={{ color: '#ff7f00', marginBottom: '15px' }}>
            🔄 {splitBillType === 'equal' ? 'Equal Split' : 'Manual Split'} Payment
          </h3>
          
          {splitBillType === 'equal' ? (
            <p style={{ color: '#ffffff', marginBottom: '20px' }}>
              Split equally among {splitBillCount} people - Each pays: ₹{splitAmount}
            </p>
          ) : (
            <p style={{ color: '#ffffff', marginBottom: '20px' }}>
              Manual split configured for {manualSplitData.filter(p => p.name.trim()).length} people
            </p>
          )}

          <div className="split-upi-collection">
            <h4 style={{ color: '#ffffff', marginBottom: '20px' }}>
              Enter UPI IDs for all members:
            </h4>
            
            {splitBillType === 'manual' ? (
              // Manual Split - Show actual names and amounts
              manualSplitData.map((person, index) => {
                if (!person.name.trim()) return null;
                
                return (
                  <div key={index} className="split-upi-input-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: '#ffffff', fontWeight: '500' }}>
                        {person.name}
                      </span>
                      <span style={{ color: '#ff7f00', fontWeight: '600' }}>
                        ₹{person.amount}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={splitUpiIds[index] || ''}
                      onChange={(e) => handleUpiIdChange(index, e.target.value)}
                      placeholder={`Enter ${person.name}'s UPI ID`}
                      className="split-upi-input"
                      style={{
                        width: '100%',
                        padding: '12px',
                        marginBottom: '20px',
                        backgroundColor: '#2c2c2c',
                        border: '2px solid #3c3c3c',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                );
              })
            ) : (
              // Equal Split - Show generic person entries
              Array.from({ length: splitBillCount }, (_, index) => (
                <div key={index} className="split-upi-input-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#ffffff', fontWeight: '500' }}>
                      Person {index + 1}
                    </span>
                    <span style={{ color: '#ff7f00', fontWeight: '600' }}>
                      ₹{splitAmount}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={splitUpiIds[index] || ''}
                    onChange={(e) => handleUpiIdChange(index, e.target.value)}
                    placeholder={`Enter Person ${index + 1}'s UPI ID`}
                    className="split-upi-input"
                    style={{
                      width: '100%',
                      padding: '12px',
                      marginBottom: '20px',
                      backgroundColor: '#2c2c2c',
                      border: '2px solid #3c3c3c',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '1rem'
                    }}
                  />
                </div>
              ))
            )}
          </div>

          <div style={{ 
            marginTop: '20px',
            padding: '15px',
            backgroundColor: 'rgba(255, 127, 0, 0.1)',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <p style={{ color: '#ff7f00', margin: 0 }}>
              Total Amount: ₹{totalAmount} | 
              {splitBillType === 'equal' 
                ? ` ${splitBillCount} people × ₹${splitAmount} each`
                : ` Split across ${manualSplitData.filter(p => p.name.trim()).length} people`
              }
            </p>
          </div>
        </div>

        {isProcessing ? (
          <div className="loading-content">
            <div className="spinner"></div>
            <p>Processing all split payments...</p>
          </div>
        ) : (
          <>
            <button className="primary-btn" onClick={processAllPayments}>
              Process All Split Payments
            </button>
            
            <button className="secondary-btn" onClick={goBack}>
              ← Back to Payment Options
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default SplitUpiCollectionPage;