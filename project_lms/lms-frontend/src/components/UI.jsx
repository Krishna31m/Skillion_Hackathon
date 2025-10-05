import React from 'react';

export function Card({ children, className = '', ...rest }){
  return <div className={`card ${className}`} {...rest}>{children}</div>;
}

export function Button({ children, className = '', ...rest }){
  return <button className={`btn ${className}`} {...rest}>{children}</button>;
}

export function Input(props){
  return <input className="form-input" {...props} />;
}

export function Textarea(props){
  return <textarea className="form-textarea" {...props} />;
}

export function Modal({ title, children, onClose, isOpen }){
  if(!isOpen) return null;
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ title = 'Confirm', message = '', isOpen, onCancel, onConfirm, confirmLabel = 'OK', cancelLabel = 'Cancel' }){
  if(!isOpen) return null;
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>
        <div className="modal-body">
          <p>{message}</p>
          <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:12}}>
            <button className="btn" onClick={onCancel}>{cancelLabel}</button>
            <button className="btn btn-danger" onClick={onConfirm}>{confirmLabel}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default { Card, Button, Input, Textarea };
