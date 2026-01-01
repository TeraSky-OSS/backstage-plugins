import {
    createBaseThemeOptions,
    createUnifiedTheme,
    genPageTheme,
    palettes,
    shapes,
    UnifiedThemeProvider,
  } from '@backstage/theme';
import { ThemeBlueprint } from '@backstage/frontend-plugin-api';
import LightIcon from '@material-ui/icons/WbSunny';
import Brightness2Icon from '@material-ui/icons/Brightness2';
import React from 'react';

const teraskyLightTheme = createUnifiedTheme({
    ...createBaseThemeOptions({
      palette: {
        ...palettes.light,
        primary: {
          main: '#2c2c3e', // Terasky primary color
        },
        secondary: {
          main: '#172b4d', // Terasky secondary color
        },
        error: {
          main: '#ff5630', // Terasky error color
        },
        warning: {
          main: '#ffab00', // Terasky warning color
        },
        info: {
          main: '#00b8d9', // Terasky info color
        },
        success: {
          main: '#36b37e', // Terasky success color
        },
        background: {
          default: '#f4f5f7', // Terasky background color
          paper: '#ffffff', // Terasky paper color
        },
        banner: {
          info: '#00b8d9', // Terasky banner info color
          error: '#ff5630', // Terasky banner error color
          text: '#172b4d', // Terasky banner text color
          link: '#0052cc', // Terasky banner link color
        },
        errorBackground: '#ff5630', // Terasky error background color
        warningBackground: '#ffab00', // Terasky warning background color
        infoBackground: '#00b8d9', // Terasky info background color
        navigation: {
          background: '#2c2c3e', // Terasky navigation background color
          indicator: '#365565', // Terasky navigation indicator color
          color: '#ffffff', // Terasky navigation color
          selectedColor: '#f07a58', // Terasky navigation selected color
        },
      },
    }),
    components: {
      // Override Backstage SidebarSubmenu width to be adaptive
      MuiPaper: {
        styleOverrides: {
          root: {
            // Target all sidebar submenu papers with adaptive sizing
            '&[role="presentation"]': {
              minWidth: '100px !important',
              maxWidth: '400px !important',
              width: 'max-content !important',
              whiteSpace: 'nowrap !important',
            },
            // More specific targeting for nested lists
            '& .MuiList-root': {
              minWidth: '100px !important',
              maxWidth: '400px !important',
              width: 'max-content !important',
            },
          },
        },
      },
      // Target the Popper component that contains the submenu
      MuiPopper: {
        styleOverrides: {
          root: {
            '& .MuiPaper-root': {
              minWidth: '100px !important',
              maxWidth: '400px !important',
              width: 'max-content !important',
              whiteSpace: 'nowrap !important',
            },
            // Ensure the popper itself is adaptive
            minWidth: '100px !important',
            maxWidth: '400px !important',
            width: 'max-content !important',
          },
        },
      },
      // Target Menu components as Backstage might use these for submenus
      MuiMenu: {
        styleOverrides: {
          paper: {
            minWidth: '100px !important',
            maxWidth: '400px !important',
            width: 'max-content !important',
            whiteSpace: 'nowrap !important',
          },
        },
      },
      // Target List items to prevent text wrapping
      MuiListItem: {
        styleOverrides: {
          root: {
            whiteSpace: 'nowrap !important',
            overflow: 'visible !important',
            textOverflow: 'clip !important',
          },
        },
      },
      // Target MenuItem components
      MuiMenuItem: {
        styleOverrides: {
          root: {
            whiteSpace: 'nowrap !important',
            overflow: 'visible !important',
            textOverflow: 'clip !important',
          },
        },
      },
      // Global CSS override for sidebar submenu specific classes
      MuiCssBaseline: {
        styleOverrides: {
          '@global': {
            // Target any element with sidebar submenu in class name
            '[class*="SidebarSubmenu"]': {
              minWidth: '100px !important',
              maxWidth: '400px !important',
              width: 'max-content !important',
            },
            // Target Material-UI menu components used in sidebar
            '.MuiPaper-root[role="presentation"]': {
              minWidth: '100px !important',
              maxWidth: '400px !important',
              width: 'max-content !important',
              whiteSpace: 'nowrap !important',
            },
            // Force all sidebar submenu related containers to be adaptive
            '[data-testid*="submenu"], [class*="submenu"], [id*="submenu"]': {
              minWidth: '100px !important',
              maxWidth: '400px !important',
              width: 'max-content !important',
            },
          },
        },
      },
    },
    defaultPageTheme: 'home',
    fontFamily: 'Roboto, sans-serif',
    /* below drives the header colors */
    pageTheme: {
      home: genPageTheme({ colors: ['#f07a58', '#2c2c3e'], shape: shapes.wave }),
      documentation: genPageTheme({
        colors: ['#f07a58', '#2c2c3e'],
        shape: shapes.wave2,
      }),
      tool: genPageTheme({ colors: ['#f07a58', '#2c2c3e'], shape: shapes.round }),
      service: genPageTheme({
        colors: ['#f07a58', '#2c2c3e'],
        shape: shapes.wave,
      }),
      website: genPageTheme({
        colors: ['#f07a58', '#2c2c3e'],
        shape: shapes.wave,
      }),
      library: genPageTheme({
        colors: ['#f07a58', '#2c2c3e'],
        shape: shapes.wave,
      }),
      other: genPageTheme({ colors: ['#f07a58', '#2c2c3e'], shape: shapes.wave }),
      app: genPageTheme({ colors: ['#f07a58', '#2c2c3e'], shape: shapes.wave }),
      apis: genPageTheme({ colors: ['#f07a58', '#2c2c3e'], shape: shapes.wave }),
    },
});

const teraskyDarkTheme = createUnifiedTheme({
    ...createBaseThemeOptions({
      palette: {
        ...palettes.dark,
        primary: {
          main: '#bebec6', // Terasky primary color
        },
        secondary: {
          main: '#172b4d', // Terasky secondary color
        },
        error: {
          main: '#ff5630', // Terasky error color
        },
        warning: {
          main: '#ffab00', // Terasky warning color
        },
        info: {
          main: '#00b8d9', // Terasky info color
        },
        success: {
          main: '#36b37e', // Terasky success color
        },
        background: {
          default: '#121212', // Dark background color
          paper: '#1e1e1e', // Dark paper color
        },
        banner: {
          info: '#00b8d9', // Terasky banner info color
          error: '#ff5630', // Terasky banner error color
          text: '#ffffff', // Terasky banner text color
          link: '#0052cc', // Terasky banner link color
        },
        errorBackground: '#ff5630', // Terasky error background color
        warningBackground: '#ffab00', // Terasky warning background color
        infoBackground: '#00b8d9', // Terasky info background color
        navigation: {
          background: '#2c2c3e', // Terasky navigation background color
          indicator: '#365565', // Terasky navigation indicator color
          color: '#ffffff', // Terasky navigation color
          selectedColor: '#f07a58', // Terasky navigation selected color
        },
      },
    }),
    components: {
      // Override Backstage SidebarSubmenu width to be adaptive
      MuiPaper: {
        styleOverrides: {
          root: {
            // Target all sidebar submenu papers with adaptive sizing
            '&[role="presentation"]': {
              minWidth: '100px !important',
              maxWidth: '400px !important',
              width: 'max-content !important',
              whiteSpace: 'nowrap !important',
            },
            // More specific targeting for nested lists
            '& .MuiList-root': {
              minWidth: '100px !important',
              maxWidth: '400px !important',
              width: 'max-content !important',
            },
          },
        },
      },
      // Target the Popper component that contains the submenu
      MuiPopper: {
        styleOverrides: {
          root: {
            '& .MuiPaper-root': {
              minWidth: '100px !important',
              maxWidth: '400px !important',
              width: 'max-content !important',
              whiteSpace: 'nowrap !important',
            },
            // Ensure the popper itself is adaptive
            minWidth: '100px !important',
            maxWidth: '400px !important',
            width: 'max-content !important',
          },
        },
      },
      // Target Menu components as Backstage might use these for submenus
      MuiMenu: {
        styleOverrides: {
          paper: {
            minWidth: '100px !important',
            maxWidth: '400px !important',
            width: 'max-content !important',
            whiteSpace: 'nowrap !important',
          },
        },
      },
      // Target List items to prevent text wrapping
      MuiListItem: {
        styleOverrides: {
          root: {
            whiteSpace: 'nowrap !important',
            overflow: 'visible !important',
            textOverflow: 'clip !important',
          },
        },
      },
      // Target MenuItem components
      MuiMenuItem: {
        styleOverrides: {
          root: {
            whiteSpace: 'nowrap !important',
            overflow: 'visible !important',
            textOverflow: 'clip !important',
          },
        },
      },
      // Global CSS override for sidebar submenu specific classes
      MuiCssBaseline: {
        styleOverrides: {
          '@global': {
            // Target any element with sidebar submenu in class name
            '[class*="SidebarSubmenu"]': {
              minWidth: '100px !important',
              maxWidth: '400px !important',
              width: 'max-content !important',
            },
            // Target Material-UI menu components used in sidebar
            '.MuiPaper-root[role="presentation"]': {
              minWidth: '100px !important',
              maxWidth: '400px !important',
              width: 'max-content !important',
              whiteSpace: 'nowrap !important',
            },
            // Force all sidebar submenu related containers to be adaptive
            '[data-testid*="submenu"], [class*="submenu"], [id*="submenu"]': {
              minWidth: '100px !important',
              maxWidth: '400px !important',
              width: 'max-content !important',
            },
          },
        },
      },
    },
    defaultPageTheme: 'home',
    fontFamily: 'Roboto, sans-serif',
    /* below drives the header colors */
    pageTheme: {
      home: genPageTheme({ colors: ['#f07a58', '#2c2c3e'], shape: shapes.wave }),
      documentation: genPageTheme({
        colors: ['#f07a58', '#2c2c3e'],
        shape: shapes.wave2,
      }),
      tool: genPageTheme({ colors: ['#f07a58', '#2c2c3e'], shape: shapes.round }),
      service: genPageTheme({
        colors: ['#f07a58', '#2c2c3e'],
        shape: shapes.wave,
      }),
      website: genPageTheme({
        colors: ['#f07a58', '#2c2c3e'],
        shape: shapes.wave,
      }),
      library: genPageTheme({
        colors: ['#f07a58', '#2c2c3e'],
        shape: shapes.wave,
      }),
      other: genPageTheme({ colors: ['#f07a58', '#2c2c3e'], shape: shapes.wave }),
      app: genPageTheme({ colors: ['#f07a58', '#2c2c3e'], shape: shapes.wave }),
      apis: genPageTheme({ colors: ['#f07a58', '#2c2c3e'], shape: shapes.wave }),
    },
});


export const teraskyThemeDark = ThemeBlueprint.make({
  name: 'terasky-dark-theme',
  params: { 
    theme: {
      id: 'terasky-dark',
      title: 'TeraSky Dark',
      variant: 'dark',
      icon: React.createElement(Brightness2Icon),
      Provider: ({ children }) => {
        return UnifiedThemeProvider({ theme: teraskyDarkTheme, children });
      },
    } 
  },
});

export const teraskyThemeLight = ThemeBlueprint.make({
  name: 'terasky-light-theme',
  params: {
    theme: {
      id: 'terasky-light',
      title: 'TeraSky Light',
      variant: 'light',
      icon: React.createElement(LightIcon),
      Provider: ({ children }) => {
        return UnifiedThemeProvider({ theme: teraskyLightTheme, children });
      },
    },
  },
});