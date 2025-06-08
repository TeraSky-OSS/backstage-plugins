import { PropsWithChildren } from 'react';
import { makeStyles } from '@material-ui/core';
import LibraryBooks from '@material-ui/icons/LibraryBooks';
import CreateComponentIcon from '@material-ui/icons/AddCircleOutline';
import LogoFull from './LogoFull';
import LogoIcon from './LogoIcon';
import {
  Settings as SidebarSettings,
  UserSettingsSignInAvatar,
} from '@backstage/plugin-user-settings';
import { SidebarSearchModal } from '@backstage/plugin-search';
import {
  Sidebar,
  sidebarConfig,
  SidebarDivider,
  SidebarGroup,
  SidebarItem,
  SidebarPage,
  SidebarScrollWrapper,
  SidebarSpace,
  useSidebarOpenState,
  Link,
  SidebarSubmenu,
  SidebarSubmenuItem,

} from '@backstage/core-components';
import MenuIcon from '@material-ui/icons/Menu';
import SearchIcon from '@material-ui/icons/Search';
import { Administration } from '@backstage-community/plugin-rbac';
import ListIcon from '@material-ui/icons/List';
import { SiKubernetes } from "react-icons/si";
import { SiOpenapiinitiative } from "react-icons/si";
import { useApp } from '@backstage/core-plugin-api';
import BrushIcon from '@material-ui/icons/Brush';
import { Typography } from '@material-ui/core';

const useSidebarLogoStyles = makeStyles({
  root: {
    width: sidebarConfig.drawerWidthClosed,
    height: 3 * sidebarConfig.logoHeight,
    display: 'flex',
    flexFlow: 'row nowrap',
    alignItems: 'center',
    marginBottom: -14,
  },
  link: {
    width: sidebarConfig.drawerWidthClosed,
    marginLeft: 24,
  },
});

const SidebarLogo = () => {
  const classes = useSidebarLogoStyles();
  const { isOpen } = useSidebarOpenState();

  return (
    <div className={classes.root}>
      <Link to="/" underline="none" className={classes.link} aria-label="Home">
        {isOpen ? <LogoFull /> : <LogoIcon />}
      </Link>
    </div>
  );
};

export const Root = ({ children }: PropsWithChildren<{}>) => (
  <SidebarPage>
    <Sidebar>
      <SidebarLogo />
      <SidebarGroup label="Search" icon={<SearchIcon />} to="/search">
        <SidebarSearchModal />
      </SidebarGroup>
      <SidebarDivider />
      <SidebarGroup label="Menu" icon={<MenuIcon />}>
        {/* Global nav, not org-specific */}
        <SidebarItem icon={ListIcon} text="Catalog" to={'/catalog'}>
          <SidebarSubmenu title="Catalog">
            <Typography variant="subtitle2" style={{ padding: '32px 16px 16px 16px', fontWeight: 'bold' }}>
              Application Components
            </Typography>
            <SidebarSubmenuItem
              title="Domains"
              to="catalog?filters[kind]=domain"
              icon={useApp().getSystemIcon('kind:domain')}
            />
            <SidebarSubmenuItem
              title="Systems"
              to="catalog?filters[kind]=system"
              icon={useApp().getSystemIcon('kind:system')}
            />
            <SidebarSubmenuItem
              title="Components"
              to="catalog?filters[kind]=component"
              icon={useApp().getSystemIcon('kind:component')}
            />
            
            <SidebarSubmenuItem
              title="Resources"
              to="catalog?filters[kind]=resource"
              icon={useApp().getSystemIcon('kind:resource')}
            />
            <SidebarDivider />
            <Typography variant="subtitle2" style={{ padding: '32px 16px 16px 16px', fontWeight: 'bold' }}>
              Documentation
            </Typography>
            <SidebarSubmenuItem icon={LibraryBooks} to="docs" title="Tech Docs" />
            <SidebarSubmenuItem
              title="API Docs"
              to="catalog?filters[kind]=api"
              icon={useApp().getSystemIcon('kind:api')}
            />
            <SidebarDivider />
            <Typography variant="subtitle2" style={{ padding: '32px 16px 16px 16px', fontWeight: 'bold' }}>
              User Management
            </Typography>
            <SidebarSubmenuItem
              title="Groups"
              to="catalog?filters[kind]=group"
              icon={useApp().getSystemIcon('kind:group')}
            />
            <SidebarSubmenuItem
              title="Users"
              to="catalog?filters[kind]=user"
              icon={useApp().getSystemIcon('kind:user')}
            />
            <SidebarDivider />
            <Typography variant="subtitle2" style={{ padding: '32px 16px 16px 16px', fontWeight: 'bold' }}>
              Additional Resources
            </Typography>
            <SidebarSubmenuItem
              title="Templates"
              to="catalog?filters[kind]=template"
              icon={useApp().getSystemIcon('kind:template')}
            />
            <SidebarSubmenuItem
              title="Locations"
              to="catalog?filters[kind]=location"
              icon={useApp().getSystemIcon('kind:location')}
            />
            
          </SidebarSubmenu>
        </SidebarItem>
        <SidebarItem icon={SiKubernetes} text="Kubernetes">
          <SidebarSubmenu title="Kubernetes">
            <Typography variant="subtitle2" style={{ padding: '32px 16px 16px 16px', fontWeight: 'bold' }}>
              Core Kubernetes
            </Typography>
            <SidebarSubmenuItem title="Namespaces" to="catalog?filters[kind]=system&filters[type]=kubernetes-namespace" icon={SiKubernetes} />
            <SidebarSubmenuItem title="Workloads" to="catalog?filters[kind]=component&filters[type]=service" icon={SiKubernetes} />
            <SidebarDivider />
            <Typography variant="subtitle2" style={{ padding: '32px 16px 16px 16px', fontWeight: 'bold' }}>
              Crossplane
            </Typography>
            
            <SidebarSubmenuItem title="Claims" to="catalog?filters[kind]=component&filters[type]=crossplane-claim" icon={SiKubernetes} />
            <SidebarSubmenuItem title="Composites" to="catalog?filters[kind]=component&filters[type]=crossplane-xr" icon={SiKubernetes} />
            <SidebarSubmenuItem title="CRDs" to="catalog?filters[kind]=api&filters[owners]=group:default/kubernetes-auto-ingested" icon={SiOpenapiinitiative} />
          </SidebarSubmenu>
        </SidebarItem>
        
        <SidebarItem icon={CreateComponentIcon} to="create" text="Create..." />
        {/* End global nav */}
        <SidebarDivider />
        <SidebarScrollWrapper>
          {/* Items in this group will be scrollable if they run out of space */}
        </SidebarScrollWrapper>
      </SidebarGroup>
      <SidebarSpace />
      <SidebarDivider />
      <SidebarGroup
        label="Settings"
        icon={<UserSettingsSignInAvatar />}
        to="/settings"
      >
        <SidebarSettings />
      </SidebarGroup>
      <SidebarItem icon={BrushIcon} to="accentuate" text="Entity Overrides" />
      <Administration />
    </Sidebar>
    {children}
  </SidebarPage>
);
