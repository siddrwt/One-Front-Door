import React, { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

export default function Layout({ children, onOpenLogin, currentTab, setCurrentTab }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-main)',
      }}
    >
      <Navbar
        onOpenLogin={onOpenLogin}
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
      />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />
        <main style={{ flex: 1, height: '100%', overflow: 'hidden', display: 'flex' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
