import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import App from './App.jsx';
import GlobalStyle from './styles/GlobalStyle';
import theme from './styles/theme';
import UnsavedChangesProvider from './shared/navigation/UnsavedChangesProvider.jsx';

const router = createBrowserRouter([
  { path: '*', element: <UnsavedChangesProvider><App /></UnsavedChangesProvider> },
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
      <ThemeProvider theme={theme}>
        <GlobalStyle />
        <RouterProvider router={router} />
      </ThemeProvider>
  </StrictMode>
);
