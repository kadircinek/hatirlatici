import { useState, useEffect } from 'react';
import {
  Grid,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Divider,
  TextField,
  Box,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PhoneIcon from '@mui/icons-material/Phone';
import BusinessIcon from '@mui/icons-material/Business';
import { supabase } from '../lib/supabase';
import { Reminder, Customer } from '../types';
import { useTheme } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';

export default function Reminders() {
  const theme = useTheme();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [filteredReminders, setFilteredReminders] = useState<Reminder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'call' | 'visit'>('all');
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  useEffect(() => {
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    try {
      const { data: customers, error } = await supabase
        .from('customers')
        .select(`
          id,
          name,
          next_call_date,
          next_visit_date,
          last_call_date,
          last_visit_date,
          call_interval,
          visit_interval
        `)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching customers:', error);
        return;
      }

      if (customers) {
        // Müşterileri hatırlatıcılara dönüştür
        const customerReminders = customers.flatMap(customer => [
          {
            id: `call-${customer.id}`,
            customerId: customer.id,
            type: 'call' as const,
            dueDate: customer.next_call_date,
            completed: false,
            customer: {
              id: customer.id,
              name: customer.name,
              lastCallDate: customer.last_call_date,
              nextCallDate: customer.next_call_date,
              lastVisitDate: customer.last_visit_date,
              nextVisitDate: customer.next_visit_date,
              callInterval: customer.call_interval,
              visitInterval: customer.visit_interval,
            } as Customer
          },
          {
            id: `visit-${customer.id}`,
            customerId: customer.id,
            type: 'visit' as const,
            dueDate: customer.next_visit_date,
            completed: false,
            customer: {
              id: customer.id,
              name: customer.name,
              lastCallDate: customer.last_call_date,
              nextCallDate: customer.next_call_date,
              lastVisitDate: customer.last_visit_date,
              nextVisitDate: customer.next_visit_date,
              callInterval: customer.call_interval,
              visitInterval: customer.visit_interval,
            } as Customer
          }
        ]);

        // Tarihe göre sırala (yakından uzağa)
        const sortedReminders = customerReminders.sort((a, b) => {
          const dateA = new Date(a.dueDate).getTime();
          const dateB = new Date(b.dueDate).getTime();
          return dateA - dateB;
        });

        console.log('Fetched reminders:', sortedReminders);
        setReminders(sortedReminders);
        setFilteredReminders(sortedReminders);
      }
    } catch (error) {
      console.error('Error in fetchReminders:', error);
    }
  };

  useEffect(() => {
    filterReminders();
  }, [reminders, searchTerm, filterType]);

  const filterReminders = () => {
    let filtered = [...reminders];

    // Arama filtresi
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(reminder => 
        reminder.customer.name.toLowerCase().includes(term)
      );
    }

    // Tip filtresi
    if (filterType !== 'all') {
      filtered = filtered.filter(reminder => reminder.type === filterType);
    }

    // Tarihe göre sırala (yakından uzağa)
    filtered.sort((a, b) => {
      const dateA = new Date(a.dueDate).getTime();
      const dateB = new Date(b.dueDate).getTime();
      return dateA - dateB;
    });

    setFilteredReminders(filtered);
  };

  const handleComplete = async (reminderId: string) => {
    try {
      const reminder = reminders.find(r => r.id === reminderId);
      if (!reminder) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + (reminder.type === 'call' 
        ? reminder.customer.callInterval 
        : reminder.customer.visitInterval));

      const { error } = await supabase
        .from('customers')
        .update({ 
          [reminder.type === 'call' ? 'last_call_date' : 'last_visit_date']: today.toISOString(),
          [reminder.type === 'call' ? 'next_call_date' : 'next_visit_date']: nextDate.toISOString()
        })
        .eq('id', reminder.customerId);

      if (error) {
        console.error('Error completing reminder:', error);
        return;
      }

      fetchReminders();
    } catch (error) {
      console.error('Error in handleComplete:', error);
    }
  };

  const getReminderColor = (dueDate: string | Date) => {
    const today = new Date();
    const reminderDate = new Date(dueDate);
    const diffTime = reminderDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'error';
    if (diffDays === 0) return 'warning';
    return 'success';
  };

  const formatDate = (dateString: string | Date) => {
    if (!dateString) return 'Henüz belirlenmedi';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Geçersiz Tarih';
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const ReminderList = ({ 
    title, 
    items, 
    icon 
  }: { 
    title: string; 
    items: Reminder[]; 
    icon: React.ReactNode;
  }) => (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {icon}
        {title}
      </Typography>
      <List>
        {items.map((reminder) => (
          <ListItem
            key={reminder.id}
            sx={{
              borderLeft: '4px solid',
              borderColor: getReminderColor(reminder.dueDate) === 'error'
                ? 'error.main'
                : getReminderColor(reminder.dueDate) === 'warning'
                ? 'warning.main'
                : 'success.main',
              mb: 1,
              borderRadius: 1,
            }}
          >
            <ListItemText
              primary={reminder.customer?.name}
              secondary={
                <Box>
                  <Typography variant="body2">
                    Son Tarih: {formatDate(reminder.dueDate)}
                  </Typography>
                  {reminder.type === 'call' && reminder.customer?.lastCallDate && (
                    <Typography variant="body2">
                      Son Görüşme: {formatDate(reminder.customer.lastCallDate)}
                    </Typography>
                  )}
                  {reminder.type === 'visit' && reminder.customer?.lastVisitDate && (
                    <Typography variant="body2">
                      Son Ziyaret: {formatDate(reminder.customer.lastVisitDate)}
                    </Typography>
                  )}
                </Box>
              }
            />
            <ListItemSecondaryAction>
              <IconButton
                edge="end"
                onClick={() => handleComplete(reminder.id)}
                color="success"
              >
                <CheckCircleIcon />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
        {items.length === 0 && (
          <ListItem>
            <ListItemText primary="Hatırlatıcı bulunamadı" />
          </ListItem>
        )}
      </List>
    </Paper>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Hatırlatıcılar
        </Typography>
      </Box>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Müşteri Ara"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth>
                <InputLabel>Filtrele</InputLabel>
                <Select
                  value={filterType}
                  label="Filtrele"
                  onChange={(e) => setFilterType(e.target.value as 'all' | 'call' | 'visit')}
                >
                  <MenuItem value="all">Tümü</MenuItem>
                  <MenuItem value="call">Aramalar</MenuItem>
                  <MenuItem value="visit">Ziyaretler</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">
                Toplam: {filteredReminders.length} hatırlatıcı
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {filteredReminders.map((reminder) => (
          <Grid item xs={12} md={6} key={reminder.id}>
            <ReminderList 
              title={reminder.type === 'call' ? 'Arama' : 'Ziyaret'} 
              items={[reminder]} 
              icon={reminder.type === 'call' ? <PhoneIcon color="error" /> : <BusinessIcon color="error" />} 
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
} 