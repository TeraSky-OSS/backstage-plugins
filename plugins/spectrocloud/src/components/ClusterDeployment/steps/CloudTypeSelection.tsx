// React import not needed for JSX in React 17+
import {
  Grid,
  Card,
  CardActionArea,
  CardContent,
  Typography,
  Box,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { CloudType, CLOUD_TYPE_LABELS, CLOUD_TYPE_DESCRIPTIONS } from '../types';
import CloudIcon from '@material-ui/icons/Cloud';

const useStyles = makeStyles(theme => ({
  root: {
    padding: theme.spacing(2),
  },
  card: {
    height: '100%',
    transition: 'all 0.2s',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: theme.shadows[8],
    },
  },
  selectedCard: {
    borderColor: theme.palette.primary.main,
    borderWidth: 2,
    borderStyle: 'solid',
  },
  cardContent: {
    textAlign: 'center',
    padding: theme.spacing(3),
  },
  icon: {
    fontSize: 64,
    color: theme.palette.primary.main,
    marginBottom: theme.spacing(2),
  },
  title: {
    fontWeight: 'bold',
    marginBottom: theme.spacing(1),
  },
  description: {
    color: theme.palette.text.secondary,
  },
}));

interface CloudTypeSelectionProps {
  selectedCloudType?: CloudType;
  onSelect: (cloudType: CloudType) => void;
}

// Only vSphere is supported for now - other cloud types will be added later
const CLOUD_TYPES: CloudType[] = ['vsphere'];

export const CloudTypeSelection = ({
  selectedCloudType,
  onSelect,
}: CloudTypeSelectionProps) => {
  const classes = useStyles();

  return (
    <Box className={classes.root}>
      <Typography variant="h5" gutterBottom>
        Select Cloud Platform
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        Choose the cloud platform where you want to deploy your Kubernetes cluster
      </Typography>

      <Grid container spacing={3}>
        {CLOUD_TYPES.map(cloudType => (
          <Grid item xs={12} sm={6} md={4} key={cloudType}>
            <Card
              className={`${classes.card} ${
                selectedCloudType === cloudType ? classes.selectedCard : ''
              }`}
            >
              <CardActionArea onClick={() => onSelect(cloudType)}>
                <CardContent className={classes.cardContent}>
                  <CloudIcon className={classes.icon} />
                  <Typography variant="h6" className={classes.title}>
                    {CLOUD_TYPE_LABELS[cloudType]}
                  </Typography>
                  <Typography variant="body2" className={classes.description}>
                    {CLOUD_TYPE_DESCRIPTIONS[cloudType]}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};
