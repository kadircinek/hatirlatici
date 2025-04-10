import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  IconButton,
  Tooltip,
} from '@mui/material';
import { format, addDays, isSameDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import AddIcon from '@mui/icons-material/Add';
import EventIcon from '@mui/icons-material/Event';
import SearchIcon from '@mui/icons-material/Search';

interface Visit {
  id: string;
  customer_id: string;
  date: string;
  type: 'visit' | 'search';
  notes: string;
  customer_name: string;
}

interface Customer {
  id: string;
  name: string;
}

export default function Calendar() {
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [visits, setVisits] = useState<Visit[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    customer_id: '',
    type: 'visit',
    notes: '',
  });

  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('Fetching initial data...');
        
        // Önce müşterileri yükle
        await fetchCustomers();
        console.log('Customers loaded:', customers);
        
        // Sonra ziyaretleri yükle
        await fetchVisits();
        console.log('Visits loaded:', visits);
      } catch (err) {
        console.error('Error initializing data:', err);
        setError('Veriler yüklenirken bir hata oluştu: ' + (err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  const fetchVisits = async () => {
    try {
      console.log('Fetching visits...');
      const { data, error } = await supabase
        .from('visits')
        .select(`
          *,
          customers (
            name
          )
        `)
        .order('date', { ascending: true });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Visits data:', data);
      const formattedVisits = data.map(visit => ({
        ...visit,
        customer_name: visit.customers?.name || 'Bilinmeyen Müşteri'
      }));
      console.log('Formatted visits:', formattedVisits);
      setVisits(formattedVisits);
    } catch (err) {
      console.error('Error in fetchVisits:', err);
      throw err;
    }
  };

  const fetchCustomers = async () => {
    try {
      console.log('Fetching customers...');
      const { data, error } = await supabase
        .from('customers')
        .select('id, name')
        .order('name');

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Customers data:', data);
      setCustomers(data || []);
    } catch (err) {
      console.error('Error in fetchCustomers:', err);
      throw err;
    }
  };

  const handleOpenDialog = (date: Date) => {
    setSelectedDate(date);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedDate(null);
    setFormData({
      customer_id: '',
      type: 'visit',
      notes: '',
    });
  };

  const handleSubmit = async () => {
    if (!selectedDate || !formData.customer_id) {
      setError('Lütfen tüm alanları doldurun');
      return;
    }

    try {
      setError(null);
      console.log('Submitting visit:', {
        customer_id: formData.customer_id,
        date: selectedDate.toISOString(),
        type: formData.type,
        notes: formData.notes,
      });

      const { error } = await supabase
        .from('visits')
        .insert({
          customer_id: formData.customer_id,
          date: selectedDate.toISOString(),
          type: formData.type,
          notes: formData.notes,
        });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      await fetchVisits();
      handleCloseDialog();
    } catch (err) {
      console.error('Error in handleSubmit:', err);
      setError('Ziyaret eklenirken bir hata oluştu: ' + (err as Error).message);
    }
  };

  const renderDay = (date: Date) => {
    const dayVisits = visits.filter(visit => 
      isSameDay(new Date(visit.date), date)
    );

    return (
      <Card
        elevation={2}
        sx={{
          height: '100%',
          minHeight: 150,
          cursor: 'pointer',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          },
        }}
        onClick={() => handleOpenDialog(date)}
      >
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              {format(date, 'd', { locale: tr })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {format(date, 'MMMM yyyy', { locale: tr })}
            </Typography>
          </Box>
          
          <Box sx={{ minHeight: 80 }}>
            {dayVisits.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
                Ziyaret/Arama yok
              </Typography>
            ) : (
              dayVisits.map(visit => (
                <Chip
                  key={visit.id}
                  label={`${visit.customer_name} - ${visit.type === 'visit' ? 'Ziyaret' : 'Arama'}`}
                  size="small"
                  sx={{ 
                    m: 0.5,
                    backgroundColor: visit.type === 'visit' ? 'primary.light' : 'secondary.light',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: visit.type === 'visit' ? 'primary.main' : 'secondary.main',
                    }
                  }}
                  icon={visit.type === 'visit' ? <EventIcon /> : <SearchIcon />}
                />
              ))
            )}
          </Box>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Box sx={{ 
        p: 3, 
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh'
      }}>
        <CircularProgress size={60} />
        <Typography sx={{ mt: 2, color: 'text.secondary' }}>Yükleniyor...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 4,
        flexWrap: 'wrap',
        gap: 2
      }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          Takvim
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            type="date"
            label="Başlangıç Tarihi"
            value={format(startDate, 'yyyy-MM-dd')}
            onChange={(e) => setStartDate(new Date(e.target.value))}
            InputLabelProps={{
              shrink: true,
            }}
            sx={{ 
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              }
            }}
          />
          <Tooltip title="Yeni Ziyaret/Arama Ekle">
            <IconButton 
              color="primary" 
              onClick={() => handleOpenDialog(new Date())}
              sx={{ 
                backgroundColor: 'primary.light',
                '&:hover': {
                  backgroundColor: 'primary.main',
                }
              }}
            >
              <AddIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {Array.from({ length: 30 }).map((_, index) => {
          const date = addDays(startDate, index);
          return (
            <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
              {renderDay(date)}
            </Grid>
          );
        })}
      </Grid>

      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
          }
        }}
      >
        <DialogTitle sx={{ 
          backgroundColor: 'primary.main',
          color: 'white',
          fontWeight: 'bold'
        }}>
          Yeni Ziyaret/Arama Ekle
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Müşteri</InputLabel>
              <Select
                value={formData.customer_id}
                label="Müşteri"
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                sx={{ borderRadius: 2 }}
              >
                {customers.map((customer) => (
                  <MenuItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>İşlem Tipi</InputLabel>
              <Select
                value={formData.type}
                label="İşlem Tipi"
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'visit' | 'search' })}
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="visit">Ziyaret</MenuItem>
                <MenuItem value="search">Arama</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Notlar"
              multiline
              rows={4}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              sx={{ borderRadius: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button 
            onClick={handleCloseDialog}
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            İptal
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            sx={{ borderRadius: 2 }}
          >
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 