import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const auth = { user: null, ready: true };
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }));
import ProtectedRoute from './ProtectedRoute';

const app = () => render(
  <MemoryRouter initialEntries={['/app']}>
    <Routes>
      <Route path="/login" element={<div>login page</div>} />
      <Route path="/app" element={<ProtectedRoute><div>secret</div></ProtectedRoute>} />
    </Routes>
  </MemoryRouter>);

describe('ProtectedRoute', () => {
  it('redirects anonymous users to login', () => {
    auth.user = null; app();
    expect(screen.getByText('login page')).toBeInTheDocument();
    expect(screen.queryByText('secret')).toBeNull();
  });
  it('renders content for signed-in users', () => {
    auth.user = { id: 1 }; app();
    expect(screen.getByText('secret')).toBeInTheDocument();
  });
});
