import {
  SidebarDivider,
  SidebarGroup,
  SidebarItem,
  SidebarScrollWrapper,
  SidebarSpace,
  SidebarSubmenu,
  SidebarSubmenuItem,
} from '@backstage/core-components';
import { compatWrapper } from '@backstage/core-compat-api';
import { Sidebar } from '@backstage/core-components';
import { NavContentBlueprint } from '@backstage/frontend-plugin-api';
import { SidebarLogo } from './SidebarLogo';
import CreateComponentIcon from '@material-ui/icons/AddCircleOutline';
import MenuIcon from '@material-ui/icons/Menu';
import SearchIcon from '@material-ui/icons/Search';
import { Administration } from '@backstage-community/plugin-rbac';
import LibraryBooks from '@material-ui/icons/LibraryBooks';
import ListIcon from '@material-ui/icons/List';
import { SiKubernetes } from "react-icons/si";
import { FaCloud, FaObjectGroup, FaProjectDiagram, FaServer } from "react-icons/fa";
import { SiOpenapiinitiative } from "react-icons/si";
import { Typography } from '@material-ui/core';
import SchoolIcon from '@material-ui/icons/School';
import { SidebarSearchModal } from '@backstage/plugin-search';
import { UserSettingsSignInAvatar, Settings as SidebarSettings } from '@backstage/plugin-user-settings';

export const SidebarContent = NavContentBlueprint.make({
  params: {
    component: ({}) =>
      compatWrapper(
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
              to="/catalog?filters[kind]=domain"
              icon={ListIcon}
            />
            <SidebarSubmenuItem
              title="Systems"
              to="/catalog?filters[kind]=system"
              icon={ListIcon}
            />
            <SidebarSubmenuItem
              title="Components"
              to="/catalog?filters[kind]=component"
              icon={ListIcon}
            />
            
            <SidebarSubmenuItem
              title="Resources"
              to="/catalog?filters[kind]=resource"
              icon={ListIcon}
            />
            <SidebarDivider />
            <Typography variant="subtitle2" style={{ padding: '32px 16px 16px 16px', fontWeight: 'bold' }}>
              Documentation
            </Typography>
            <SidebarSubmenuItem icon={LibraryBooks} to="docs" title="Tech Docs" />
            <SidebarSubmenuItem
              title="API Docs"
              to="/catalog?filters[kind]=api"
              icon={ListIcon}
            />
            <SidebarDivider />
            <Typography variant="subtitle2" style={{ padding: '32px 16px 16px 16px', fontWeight: 'bold' }}>
              User Management
            </Typography>
            <SidebarSubmenuItem
              title="Groups"
              to="/catalog?filters[kind]=group"
              icon={ListIcon}
            />
            <SidebarSubmenuItem
              title="Users"
              to="/catalog?filters[kind]=user"
              icon={ListIcon}
            />
            <SidebarDivider />
            <Typography variant="subtitle2" style={{ padding: '32px 16px 16px 16px', fontWeight: 'bold' }}>
              Additional Resources
            </Typography>
            <SidebarSubmenuItem
              title="Templates"
              to="/catalog?filters[kind]=template"
              icon={ListIcon}
            />
            <SidebarSubmenuItem
              title="Locations"
              to="/catalog?filters[kind]=location"
              icon={ListIcon}
            />
            
          </SidebarSubmenu>
        </SidebarItem>
        <SidebarItem icon={SiKubernetes} text="Kubernetes">
          <SidebarSubmenu title="Kubernetes">
            <Typography variant="subtitle2" style={{ padding: '32px 16px 16px 16px', fontWeight: 'bold' }}>
              Core Kubernetes
            </Typography>
            <SidebarSubmenuItem title="Namespaces" to="/catalog?filters[kind]=system&filters[type]=kubernetes-namespace" icon={SiKubernetes} />
            <SidebarSubmenuItem title="Workloads" to="/catalog?filters[kind]=component&filters[type]=service" icon={SiKubernetes} />
            <SidebarDivider />
            <Typography variant="subtitle2" style={{ padding: '32px 16px 16px 16px', fontWeight: 'bold' }}>
              Crossplane
            </Typography>
            
            <SidebarSubmenuItem title="Claims" to="/catalog?filters[kind]=component&filters[type]=crossplane-claim" icon={SiKubernetes} />
            <SidebarSubmenuItem title="Composites" to="/catalog?filters[kind]=component&filters[type]=crossplane-xr" icon={SiKubernetes} />
            <SidebarSubmenuItem title="CRDs" to="/catalog?filters[kind]=api&filters[owners]=group:default/kubernetes-auto-ingested" icon={SiOpenapiinitiative} />
            <Typography variant="subtitle2" style={{ padding: '32px 16px 16px 16px', fontWeight: 'bold' }}>
              KRO
            </Typography>
            <SidebarSubmenuItem title="Instances" to="/catalog?filters[kind]=component&filters[type]=kro-instance" icon={SiKubernetes} />
          </SidebarSubmenu>
        </SidebarItem>
        <SidebarItem icon={FaCloud} text="VCF Automation">
          <SidebarSubmenu title="VCF Automation">
            <Typography variant="subtitle2" style={{ padding: '32px 16px 16px 16px', fontWeight: 'bold' }}>
              VCF Automation
            </Typography>
            <SidebarSubmenuItem title="Projects" to="/catalog?filters[kind]=domain&filters[type]=vcf-automation-project" icon={FaProjectDiagram} />
            <SidebarSubmenuItem title="Deployments" to="/catalog?filters[kind]=system&filters[type]=vcf-automation-deployment" icon={FaObjectGroup} />
            <SidebarSubmenuItem title="vSphere VMs" to="/catalog?filters[kind]=component&filters[type]=cloud.vsphere.machine" icon={FaServer} />
            <SidebarSubmenuItem title="Supervisor Namespaces" to="/catalog?filters[kind]=component&filters[type]=cci.supervisor.namespace" icon={SiKubernetes} />
            <SidebarSubmenuItem title="Supervisor Resources" to="/catalog?filters[kind]=component&filters[type]=cci.supervisor.resource" icon={SiKubernetes} />
            <SidebarSubmenuItem title="Other Resources" to="/catalog?filters[kind]=resource&filters[tags]=vcf-automation-resource" icon={FaCloud} />
          </SidebarSubmenu>
        </SidebarItem>
        
        <SidebarItem icon={CreateComponentIcon} to="/create" text="Create..." />
        <SidebarItem icon={SchoolIcon} to="/educates" text="Workshops" />
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
      <Administration />
    </Sidebar>
      ),
  },
});
