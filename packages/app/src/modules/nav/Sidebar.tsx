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
import { NavContentBlueprint } from '@backstage/plugin-app-react';
import { SidebarLogo } from './SidebarLogo';
import CreateComponentIcon from '@material-ui/icons/AddCircleOutline';
import MenuIcon from '@material-ui/icons/Menu';
import SearchIcon from '@material-ui/icons/Search';
import { Administration } from '@backstage-community/plugin-rbac';
import LibraryBooks from '@material-ui/icons/LibraryBooks';
import EditIcon from '@material-ui/icons/Edit';
import ListIcon from '@material-ui/icons/List';
// import AddCircleIcon from '@material-ui/icons/AddCircle';
import { SiKubernetes } from "react-icons/si";
import { FaCloud, FaObjectGroup, FaProjectDiagram, FaServer } from "react-icons/fa";
import { SiOpenapiinitiative } from "react-icons/si";
import { Typography } from '@material-ui/core';
import SchoolIcon from '@material-ui/icons/School';
import { SidebarSearchModal } from '@backstage/plugin-search';
import { UserSettingsSignInAvatar, Settings as SidebarSettings } from '@backstage/plugin-user-settings';

export const SidebarContent: ReturnType<typeof NavContentBlueprint.make> = NavContentBlueprint.make({
  params: {
    component: ({ navItems }) => {
      // Resolve base paths from each plugin's registered page extension instead of
      // hardcoding them, so links stay correct if a plugin's mount path ever changes.
      // Sub-menu items below only add catalog filter query strings on top of these.
      const takeHref = (id: string, fallback: string) =>
        navItems.take(id)?.href ?? fallback;
      const catalogHref = takeHref('page:catalog', '/catalog');
      const scaffolderHref = takeHref('page:scaffolder', '/create');
      const templateBuilderHref = takeHref(
        'page:template-builder/template-builder-page',
        '/template-builder',
      );
      const spectroDeployHref = takeHref(
        'page:spectrocloud/spectrocloud.cluster-deployment',
        '/spectrocloud/deploy',
      );
      const spectroClustersHref = takeHref(
        'page:spectrocloud/spectrocloud.cluster-viewer',
        '/spectrocloud/clusters',
      );
      const spectroVirtualClustersHref = takeHref(
        'page:spectrocloud/spectrocloud.virtual-cluster-viewer',
        '/spectrocloud/virtualclusters',
      );
      const educatesHref = takeHref('page:educates', '/educates');

      return compatWrapper(
      <Sidebar>
      <SidebarLogo />
      <SidebarGroup label="Search" icon={<SearchIcon />} to="/search">
        <SidebarSearchModal />
      </SidebarGroup>
      <SidebarDivider />
      <SidebarGroup label="Menu" icon={<MenuIcon />}>
        {/* Global nav, not org-specific */}
        <SidebarItem icon={ListIcon} text="Catalog" to={catalogHref}>
          <SidebarSubmenu title="Catalog">
            <Typography variant="subtitle2" style={{ padding: '32px 16px 16px 16px', fontWeight: 'bold' }}>
              Application Components
            </Typography>
            <SidebarSubmenuItem
              title="Domains"
              to={`${catalogHref}?filters[kind]=domain`}
              icon={ListIcon}
            />
            <SidebarSubmenuItem
              title="Systems"
              to={`${catalogHref}?filters[kind]=system`}
              icon={ListIcon}
            />
            <SidebarSubmenuItem
              title="Components"
              to={`${catalogHref}?filters[kind]=component`}
              icon={ListIcon}
            />

            <SidebarSubmenuItem
              title="Resources"
              to={`${catalogHref}?filters[kind]=resource`}
              icon={ListIcon}
            />
            <SidebarDivider />
            <Typography variant="subtitle2" style={{ padding: '32px 16px 16px 16px', fontWeight: 'bold' }}>
              Documentation
            </Typography>
            <SidebarSubmenuItem icon={LibraryBooks} to="docs" title="Tech Docs" />
            <SidebarSubmenuItem
              title="API Docs"
              to={`${catalogHref}?filters[kind]=api`}
              icon={ListIcon}
            />
            <SidebarDivider />
            <Typography variant="subtitle2" style={{ padding: '32px 16px 16px 16px', fontWeight: 'bold' }}>
              User Management
            </Typography>
            <SidebarSubmenuItem
              title="Groups"
              to={`${catalogHref}?filters[kind]=group`}
              icon={ListIcon}
            />
            <SidebarSubmenuItem
              title="Users"
              to={`${catalogHref}?filters[kind]=user`}
              icon={ListIcon}
            />
            <SidebarDivider />
            <Typography variant="subtitle2" style={{ padding: '32px 16px 16px 16px', fontWeight: 'bold' }}>
              Additional Resources
            </Typography>
            <SidebarSubmenuItem
              title="Templates"
              to={`${catalogHref}?filters[kind]=template`}
              icon={ListIcon}
            />
            <SidebarSubmenuItem
              title="Locations"
              to={`${catalogHref}?filters[kind]=location`}
              icon={ListIcon}
            />

          </SidebarSubmenu>
        </SidebarItem>
        <SidebarItem icon={SiKubernetes} text="Kubernetes">
          <SidebarSubmenu title="Kubernetes">
            <Typography variant="subtitle2" style={{ padding: '32px 16px 16px 16px', fontWeight: 'bold' }}>
              Core Kubernetes
            </Typography>
            <SidebarSubmenuItem title="Namespaces" to={`${catalogHref}?filters[kind]=system&filters[type]=kubernetes-namespace`} icon={SiKubernetes} />
            <SidebarSubmenuItem title="Workloads" to={`${catalogHref}?filters[kind]=component&filters[type]=service`} icon={SiKubernetes} />
            <SidebarSubmenuItem title="CRDs" to={`${catalogHref}?filters[kind]=api&filters[tags]=crd`} icon={SiOpenapiinitiative} />
            <SidebarDivider />
            <Typography variant="subtitle2" style={{ padding: '32px 16px 16px 16px', fontWeight: 'bold' }}>
              Crossplane
            </Typography>

            <SidebarSubmenuItem title="Claims" to={`${catalogHref}?filters[kind]=component&filters[type]=crossplane-claim`} icon={SiKubernetes} />
            <SidebarSubmenuItem title="Composites" to={`${catalogHref}?filters[kind]=component&filters[type]=crossplane-xr`} icon={SiKubernetes} />
            <SidebarSubmenuItem title="XRDs" to={`${catalogHref}?filters[kind]=api&filters[tags]=crossplane`} icon={SiOpenapiinitiative} />
            <Typography variant="subtitle2" style={{ padding: '32px 16px 16px 16px', fontWeight: 'bold' }}>
              KRO
            </Typography>
            <SidebarSubmenuItem title="Instances" to={`${catalogHref}?filters[kind]=component&filters[type]=kro-instance`} icon={SiKubernetes} />
            <SidebarSubmenuItem title="RGDs" to={`${catalogHref}?filters[kind]=api&filters[tags]=kro`} icon={SiOpenapiinitiative} />
          </SidebarSubmenu>
        </SidebarItem>
        <SidebarItem icon={SiKubernetes} text="Spectro" to={spectroDeployHref}>
          <SidebarSubmenu title="Spectro Cloud">
            <Typography variant="subtitle2" style={{ padding: '32px 16px 16px 16px', fontWeight: 'bold' }}>
              Spectro Cloud Palette
            </Typography>
            <SidebarSubmenuItem
              title="Clusters"
              to={spectroClustersHref}
              icon={SiKubernetes}
            />
            <SidebarSubmenuItem
              title="Virtual Clusters"
              to={spectroVirtualClustersHref}
              icon={SiKubernetes}
            />
            {/* <SidebarSubmenuItem
              title="Create Cluster"
              to={spectroDeployHref}
              icon={AddCircleIcon}
            /> */}
          </SidebarSubmenu>
        </SidebarItem>
        <SidebarItem icon={FaCloud} text="VCF Automation">
          <SidebarSubmenu title="VCF Automation">
            <Typography variant="subtitle2" style={{ padding: '32px 16px 16px 16px', fontWeight: 'bold' }}>
              VCF Automation
            </Typography>
            <SidebarSubmenuItem title="Projects" to={`${catalogHref}?filters[kind]=domain&filters[type]=vcf-automation-project`} icon={FaProjectDiagram} />
            <SidebarSubmenuItem title="Deployments" to={`${catalogHref}?filters[kind]=system&filters[type]=vcf-automation-deployment`} icon={FaObjectGroup} />
            <SidebarSubmenuItem title="vSphere VMs" to={`${catalogHref}?filters[kind]=component&filters[type]=cloud.vsphere.machine`} icon={FaServer} />
            <SidebarSubmenuItem title="Supervisor Namespaces" to={`${catalogHref}?filters[kind]=component&filters[type]=cci.supervisor.namespace`} icon={SiKubernetes} />
            <SidebarSubmenuItem title="Supervisor Resources" to={`${catalogHref}?filters[kind]=component&filters[type]=cci.supervisor.resource`} icon={SiKubernetes} />
            <SidebarSubmenuItem title="Other Resources" to={`${catalogHref}?filters[kind]=resource&filters[tags]=vcf-automation-resource`} icon={FaCloud} />
          </SidebarSubmenu>
        </SidebarItem>
        <SidebarItem icon={CreateComponentIcon} text="Scaffolder">
          <SidebarSubmenu title="Scaffolder">
            <Typography variant="subtitle2" style={{ padding: '32px 16px 16px 16px', fontWeight: 'bold' }}>
              Scaffolder
            </Typography>
            <SidebarSubmenuItem
              title="Create"
              to={scaffolderHref}
              icon={CreateComponentIcon}
            />
            <SidebarSubmenuItem
              title="Design"
              to={templateBuilderHref}
              icon={EditIcon}
            />
            <SidebarSubmenuItem
              title="Templates"
              to={`${catalogHref}?filters[kind]=template`}
              icon={ListIcon}
            />
          </SidebarSubmenu>
        </SidebarItem>
        <SidebarItem icon={SchoolIcon} to={educatesHref} text="Workshops" />
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
      );
    },
  },
});
