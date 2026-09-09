import { Flex, Link, Tooltip, TooltipTrigger } from '@backstage/ui';
import { RiHomeLine, RiBookLine, RiCompassLine, RiGithubLine } from '@remixicon/react';

const EDUCATES_LINKS = [
  {
    href: 'https://educates.dev',
    label: 'Educates Homepage',
    Icon: RiHomeLine,
  },
  {
    href: 'https://docs.educates.dev/en/stable',
    label: 'Educates Documentation',
    Icon: RiBookLine,
  },
  {
    href: 'https://hub.educates.dev/?type=Workshop',
    label: 'Educates Hub',
    Icon: RiCompassLine,
  },
  {
    href: 'https://github.com/educates/educates-training-platform',
    label: 'Educates GitHub Repository',
    Icon: RiGithubLine,
  },
];

export const EducatesHeaderActions = () => (
  <Flex gap="2" align="center">
    {EDUCATES_LINKS.map(({ href, label, Icon }) => (
      <TooltipTrigger key={href}>
        <Link href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>
          <Icon size={18} />
        </Link>
        <Tooltip>{label}</Tooltip>
      </TooltipTrigger>
    ))}
  </Flex>
);
