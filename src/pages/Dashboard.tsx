import { useEffect, useState } from 'react';
import {
  Grid,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Box,
  Card,
  CardContent,
  LinearProgress,
  Chip,
} from '@mui/material';
import PhoneIcon from '@mui/icons-material/Phone';
import BusinessIcon from '@mui/icons-material/Business';
import { supabase } from '../lib/supabase';
import { Customer } from '../types';

export default function Dashboard() {
  const [todayCalls, setTodayCalls] = useState<Customer[]>([]);
  const [todayVisits, setTodayVisits] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodayTasks();
  }, []);

  const fetchTodayTasks = async () => {
    setLoading(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: callCustomers } = await supabase
      .from('customers')
      .select('*')
      .lte('nextCallDate', today.toISOString());

    const { data: visitCustomers } = await supabase
      .from('customers')
      .select('*')
      .lte('nextVisitDate', today.toISOString());

    if (callCustomers) setTodayCalls(callCustomers);
    if (visitCustomers) setTodayVisits(visitCustomers);
    setLoading(false);
  };

  const TaskCard = ({ title, items, icon, type }: { 
    title: string; 
    items: Customer[]; 
    icon: React.ReactNode;
    type: 'call' | 'visit';
  }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box
            sx={{
              backgroundColor: type === 'call' ? 'primary.light' : 'secondary.light',
              borderRadius: '50%',
              p: 1,
              mr: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
          <Typography variant="h6" component="div">
            {title}
          </Typography>
          <Chip
            label={`${items.length} tasks`}
            color={type === 'call' ? 'primary' : 'secondary'}
            size="small"
            sx={{ ml: 'auto' }}
          />
        </Box>
        {loading ? (
          <LinearProgress />
        ) : (
          <List sx={{ p: 0 }}>
            {items.map((customer) => (
              <ListItem
                key={customer.id}
                sx={{
                  mb: 1,
                  borderRadius: 2,
                  backgroundColor: 'background.paper',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {type === 'call' ? (
                    <PhoneIcon color="primary" />
                  ) : (
                    <BusinessIcon color="secondary" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={customer.name}
                  secondary={
                    <>
                      <Typography variant="body2" color="text.secondary">
                        {customer.company}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Last {type}: {new Date(
                          type === 'call' ? customer.lastCallDate || '' : customer.lastVisitDate || ''
                        ).toLocaleDateString()}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
            ))}
            {items.length === 0 && !loading && (
              <ListItem>
                <ListItemText
                  primary={`No ${type}s scheduled for today`}
                  sx={{ textAlign: 'center', color: 'text.secondary' }}
                />
              </ListItem>
            )}
          </List>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Today's Tasks
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TaskCard
            title="Today's Calls"
            items={todayCalls}
            icon={<PhoneIcon sx={{ color: 'primary.main' }} />}
            type="call"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TaskCard
            title="Today's Visits"
            items={todayVisits}
            icon={<BusinessIcon sx={{ color: 'secondary.main' }} />}
            type="visit"
          />
        </Grid>
      </Grid>
    </Box>
  );
} 