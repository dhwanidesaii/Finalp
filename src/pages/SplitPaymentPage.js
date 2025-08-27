// src/pages/SplitPaymentPage.js

import React, { useState, useContext, useEffect } from "react";
import { CartContext } from "../context/CartContext";
import { useNavigate, useLocation } from "react-router-dom";
import "./PaymentPage.css"; // Reusing the same styles

const SplitPaymentPage = () => {
  const { 
    cartItems, 
    calculateTotal, 
    manualSplitData,
    getManualSplitSummary,
    clearCart 
  } = useContext(CartContext);
  
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedPeople, setSelectedPeople] = useState([]);
  const [paymentStatuses, setPaymentStatuses] = useState({});
  const [upiIds, setUpiIds] = useState({});
  const [showUpiForm, setShowUpiForm] = useState(false);
  const [currentPayingPerson, setCurrentPayingPerson] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // initial payer UPI ID is not used directly here

  const totalAmount = calculateTotal();
  const manualSplitSummary = getManualSplitSummary();

  useEffect(() => {
    // If cart is empty or manual split not configured, redirect
    if (cartItems.length === 0 || !manualSplitSummary.isValid) {
      navigate('/cart');
    }

    // Initialize payment statuses for each person
    const initialStatuses = {};
    manualSplitData.forEach((person, index) => {
      if (person.name.trim()) {
        initialStatuses[index] = 'pending';
      }
    });
    setPaymentStatuses(initialStatuses);
  }, [cartItems, manualSplitSummary, navigate, manualSplitData]);

  const handlePersonSelection = (index) => {
    setSelectedPeople(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  const processSelectedPayments = () => {
    if (selectedPeople.length === 0) {
      alert('Please select at least one person to process payment for');
      return;
    }

    // Start UPI collection for the first selected person
    const firstPersonIndex = selectedPeople[0];
    setCurrentPayingPerson(firstPersonIndex);
    setShowUpiForm(true);
  };

  const processIndividualUPIPayment = () => {
    const upiId = upiIds[currentPayingPerson];
    if (!upiId || !upiId.trim()) {
      alert('Please enter UPI ID for this person');
      return;
    }

    setIsProcessing(true);

    // Simulate payment processing
    setTimeout(() => {
      const newStatuses = { ...paymentStatuses };
      newStatuses[currentPayingPerson] = 'completed';
      setPaymentStatuses(newStatuses);

      // Remove the completed person from selected list
      const remainingPeople = selectedPeople.filter(index => index !== currentPayingPerson);
      setSelectedPeople(remainingPeople);

      setIsProcessing(false);
      setShowUpiForm(false);

      if (remainingPeople.length > 0) {
        // Process next person
        setTimeout(() => {
          const nextPersonIndex = remainingPeople[0];
          setCurrentPayingPerson(nextPersonIndex);
          setShowUpiForm(true);
        }, 1000);
      } else {
        // Check if all payments are completed
        const allCompleted = Object.values(newStatuses).every(status => status === 'completed');
        if (allCompleted) {
          setShowSuccess(true);
          setTimeout(() => {
            clearCart();
          }, 3000);
        }
        setCurrentPayingPerson(null);
      }
    }, 2000);
  };

  const handleUpiIdChange = (personIndex, upiId) => {
    setUpiIds(prev => ({
      ...prev,
      [personIndex]: upiId
    }));
  };

  const goBack = () => {
    navigate('/payment');
  };

  const goHome = () => {
    navigate('/');
  };

  if (showSuccess) {
    return (
      <div className="payment-container">
        <div className="payment-card">
          <div className="logo">
            <div className="logo-icon">🍔</div>
            <span className="logo-text">FoodDelivery</span>
          </div>
          <div className="success-message">
            <div className="success-icon">✅</div>
            <h2>All Payments Completed!</h2>
            <p>Order confirmed. All split payments have been processed successfully.</p>
            <button className="primary-btn" onClick={goHome}>
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showUpiForm && currentPayingPerson !== null) {
    const currentPerson = manualSplitData[currentPayingPerson];
    return (
      <div className="payment-container">
        <div className="payment-card">
          <div className="logo">
            <div className="logo-icon">🍔</div>
            <span className="logo-text">FoodDelivery</span>
          </div>
          
          <div className="upi-payment-form">
            <h2>UPI Payment</h2>
            <p style={{ color: '#aaaaaa', marginBottom: '20px' }}>
              Enter UPI ID for: <strong style={{ color: '#ff7f00' }}>{currentPerson.name}</strong>
            </p>
            <div className="input-group">
              <label>UPI ID</label>
              <input
                type="text"
                value={upiIds[currentPayingPerson] || ''}
                onChange={(e) => handleUpiIdChange(currentPayingPerson, e.target.value)}
                placeholder="Enter UPI ID"
              />
            </div>
            <div className="amount-display">
              <span>Amount to Pay:</span>
              <span className="amount">₹{currentPerson.amount}</span>
            </div>
            
            {isProcessing ? (
              <div className="loading-content">
                <div className="spinner"></div>
                <p>Processing payment for {currentPerson.name}...</p>
              </div>
            ) : (
              <>
                <button className="primary-btn" onClick={processIndividualUPIPayment}>
                  Pay ₹{currentPerson.amount}
                </button>
                <button className="secondary-btn" onClick={() => setShowUpiForm(false)}>
                  Cancel
                </button>
                
                {selectedPeople.length > 1 && (
                  <p style={{ color: '#aaaaaa', marginTop: '15px', textAlign: 'center' }}>
                    {selectedPeople.length - 1} more payments pending
                  </p>
                )}
              </>
            )}
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
        
        <h1 className="main-heading">Split Payment</h1>
        <p className="sub-text">Process individual payments for each person</p>
        
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

        <div className="split-people-container">
          <h3 style={{ color: '#ffffff', marginBottom: '20px' }}>Individual Payments</h3>
          
          {manualSplitData.map((person, index) => {
            if (!person.name.trim()) return null;
            
            const status = paymentStatuses[index];
            const isSelected = selectedPeople.includes(index);
            
            return (
              <div 
                key={index} 
                className={`split-person-card ${status} ${isSelected ? 'selected' : ''}`}
                onClick={() => status === 'pending' && handlePersonSelection(index)}
                style={{
                  padding: '20px',
                  margin: '10px 0',
                  backgroundColor: status === 'completed' ? '#2d5a2d' : isSelected ? 'rgba(255, 127, 0, 0.2)' : '#2c2c2c',
                  border: isSelected ? '2px solid #ff7f00' : status === 'completed' ? '2px solid #4caf50' : '2px solid #3c3c3c',
                  borderRadius: '12px',
                  cursor: status === 'pending' ? 'pointer' : 'default',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ color: '#ffffff', margin: '0 0 5px 0' }}>{person.name}</h4>
                    <p style={{ color: '#aaaaaa', margin: 0 }}>Amount: ₹{person.amount}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {status === 'completed' && (
                      <span style={{ color: '#4caf50', fontSize: '1.5rem', marginRight: '10px' }}>✓</span>
                    )}
                    {status === 'pending' && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handlePersonSelection(index)}
                        style={{ 
                          width: '20px', 
                          height: '20px',
                          accentColor: '#ff7f00'
                        }}
                      />
                    )}
                  </div>
                </div>
                {status === 'pending' && isSelected && (
                  <div style={{ marginTop: '10px', fontSize: '0.9rem', color: '#ff7f00' }}>
                    Selected for payment
                  </div>
                )}
                {status === 'completed' && (
                  <div style={{ marginTop: '10px', fontSize: '0.9rem', color: '#4caf50' }}>
                    Payment completed
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {selectedPeople.length > 0 && (
          <div style={{ 
            margin: '20px 0',
            padding: '15px',
            backgroundColor: 'rgba(255, 127, 0, 0.1)',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <p style={{ color: '#ff7f00', margin: 0 }}>
              Total amount for selected people: ₹
              {selectedPeople.reduce((sum, index) => sum + manualSplitData[index].amount, 0)}
            </p>
          </div>
        )}

        {isProcessing ? (
          <div className="loading-content">
            <div className="spinner"></div>
            <p>Processing selected payments...</p>
          </div>
        ) : (
          <>
            <button 
              className="primary-btn" 
              onClick={processSelectedPayments}
              disabled={selectedPeople.length === 0}
              style={{
                opacity: selectedPeople.length === 0 ? 0.5 : 1,
                cursor: selectedPeople.length === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              Process Selected Payments ({selectedPeople.length})
            </button>
            
            <button className="secondary-btn" onClick={goBack}>
              ← Back to Payment Options
            </button>
          </>
        )}

        <div style={{ 
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#2c2c2c',
          borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ color: '#aaaaaa' }}>Total Allocated:</span>
            <span style={{ color: '#ffffff' }}>₹{manualSplitSummary.manualTotal}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#aaaaaa' }}>Remaining:</span>
            <span style={{ color: '#ffffff' }}>₹{manualSplitSummary.remaining}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplitPaymentPage;