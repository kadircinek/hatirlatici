import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Tooltip,
  Chip,
  useTheme,
  Snackbar,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Search as SearchIcon } from '@mui/icons-material';
import { supabase } from '../lib/supabase';
import CustomerActions from '../components/CustomerActions';
import { Customer, Product } from '../types';

interface FormData {
  name: string;
  company: string;
  address: string;
  sector: string;
  callInterval: string;
  visitInterval: string;
  notes: string;
  products: Array<{ name: string; averageTonnage: string }>;
}

export default function Customers() {
  const theme = useTheme();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'call' | 'visit'>('all');
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    company: '',
    address: '',
    sector: '',
    callInterval: '7',
    visitInterval: '30',
    notes: '',
    products: [{ name: '', averageTonnage: '' }],
  });
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [customers, searchTerm, filterType]);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          products:products(*)
        `)
        .order('name', { ascending: true });

      if (error) throw error;
      if (data) setCustomers(data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setSnackbar({
        open: true,
        message: 'Müşteriler alınırken bir hata oluştu',
        severity: 'error',
      });
    }
  };

  const filterCustomers = () => {
    let filtered = [...customers];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(customer => {
        const nameMatch = customer.name?.toLowerCase().includes(term) || false;
        const companyMatch = customer.company?.toLowerCase().includes(term) || false;
        const productMatch = customer.products?.some(product => 
          product.name?.toLowerCase().includes(term)
        ) || false;

        return nameMatch || companyMatch || productMatch;
      });
    }

    if (filterType !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      filtered = filtered.filter(customer => {
        if (filterType === 'call') {
          return customer.next_call_date && new Date(customer.next_call_date) <= today;
        } else if (filterType === 'visit') {
          return customer.next_visit_date && new Date(customer.next_visit_date) <= today;
        }
        return true;
      });
    }

    setFilteredCustomers(filtered);
  };

  const handleOpen = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        company: customer.company,
        address: customer.address || '',
        sector: customer.sector || '',
        callInterval: customer.call_interval.toString(),
        visitInterval: customer.visit_interval.toString(),
        notes: customer.notes || '',
        products: customer.products.map(p => ({ 
          name: p.name,
          averageTonnage: p.average_tonnage?.toString() || ''
        })),
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        name: '',
        company: '',
        address: '',
        sector: '',
        callInterval: '7',
        visitInterval: '30',
        notes: '',
        products: [{ name: '', averageTonnage: '' }],
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingCustomer(null);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.company) {
      setSnackbar({
        open: true,
        message: 'Lütfen gerekli alanları doldurun (İsim ve Şirket)',
        severity: 'error',
      });
      return;
    }

    try {
      console.log('Form verileri:', formData);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const nextCallDate = new Date(today);
      nextCallDate.setDate(today.getDate() + Number(formData.callInterval || 7));

      const nextVisitDate = new Date(today);
      nextVisitDate.setDate(today.getDate() + Number(formData.visitInterval || 30));

      const customerData = {
        name: formData.name,
        company: formData.company,
        address: formData.address || '',
        sector: formData.sector || '',
        call_interval: Number(formData.callInterval || 7),
        visit_interval: Number(formData.visitInterval || 30),
        last_call_date: null,
        last_visit_date: null,
        next_call_date: nextCallDate.toISOString(),
        next_visit_date: nextVisitDate.toISOString(),
        notes: formData.notes || '',
      };

      console.log('Kaydedilecek müşteri verisi:', customerData);

      let customerId;
      if (editingCustomer) {
        console.log('Müşteri güncelleniyor:', editingCustomer.id);
        const { error: updateError } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', editingCustomer.id);

        if (updateError) {
          console.error('Müşteri güncelleme hatası:', updateError);
          throw updateError;
        }
        customerId = editingCustomer.id;

        console.log('Eski ürünler siliniyor');
        await supabase
          .from('products')
          .delete()
          .eq('customer_id', customerId);
      } else {
        console.log('Yeni müşteri ekleniyor');
        const { data, error: insertError } = await supabase
          .from('customers')
          .insert([customerData])
          .select()
          .single();

        if (insertError) {
          console.error('Müşteri ekleme hatası:', insertError);
          throw insertError;
        }
        console.log('Müşteri başarıyla eklendi:', data);
        customerId = data.id;
      }

      const productsToInsert = formData.products
        .filter(p => p.name.trim() !== '')
        .map(p => ({
          customer_id: customerId,
          name: p.name.trim(),
          average_tonnage: Number(p.averageTonnage) || 0,
        }));

      console.log('Eklenecek ürünler:', productsToInsert);

      if (productsToInsert.length > 0) {
        const { error: productsError } = await supabase
          .from('products')
          .insert(productsToInsert);

        if (productsError) {
          console.error('Ürün ekleme hatası:', productsError);
          throw productsError;
        }
        console.log('Ürünler başarıyla eklendi');
      }

      setSnackbar({
        open: true,
        message: editingCustomer ? 'Müşteri güncellendi' : 'Müşteri eklendi',
        severity: 'success',
      });

      handleClose();
      fetchCustomers();
    } catch (error) {
      console.error('Müşteri kaydetme hatası:', error);
      setSnackbar({
        open: true,
        message: 'Müşteri kaydedilirken bir hata oluştu: ' + (error as Error).message,
        severity: 'error',
      });
    }
  };

  const handleDelete = async (customer: Customer) => {
    if (!window.confirm(`${customer.name} müşterisini silmek istediğinize emin misiniz?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customer.id);

      if (error) throw error;

      setSnackbar({
        open: true,
        message: 'Müşteri silindi',
        severity: 'success',
      });

      fetchCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
      setSnackbar({
        open: true,
        message: 'Müşteri silinirken bir hata oluştu',
        severity: 'error',
      });
    }
  };

  const handleAddProduct = () => {
    setFormData({
      ...formData,
      products: [...formData.products, { name: '', averageTonnage: '' }],
    });
  };

  const handleRemoveProduct = (index: number) => {
    setFormData({
      ...formData,
      products: formData.products.filter((_, i) => i !== index),
    });
  };

  const handleProductChange = (index: number, field: 'name' | 'averageTonnage', value: string) => {
    const newProducts = [...formData.products];
    newProducts[index] = { ...newProducts[index], [field]: value };
    setFormData({
      ...formData,
      products: newProducts,
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Müşteriler
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Yeni Müşteri
        </Button>
      </Box>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Ara (İsim, Şirket veya Ürün)"
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
                  <MenuItem value="call">Arama Gerekenler</MenuItem>
                  <MenuItem value="visit">Ziyaret Gerekenler</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">
                Toplam: {filteredCustomers.length} müşteri
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>İsim</TableCell>
                  <TableCell>Şirket</TableCell>
                  <TableCell>Adres</TableCell>
                  <TableCell>Ürünler</TableCell>
                  <TableCell>Son Görüşme</TableCell>
                  <TableCell>Sonraki Görüşme</TableCell>
                  <TableCell>Son Ziyaret</TableCell>
                  <TableCell>Sonraki Ziyaret</TableCell>
                  <TableCell>İşlemler</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {customer.name}
                      </Typography>
                    </TableCell>
                    <TableCell>{customer.company}</TableCell>
                    <TableCell>{customer.address || '-'}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {customer.products.map((product, index) => (
                          <Chip
                            key={index}
                            label={product.name}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {customer.last_call_date ? new Date(customer.last_call_date).toLocaleDateString('tr-TR') : 'Henüz arama yapılmadı'}
                    </TableCell>
                    <TableCell>
                      {customer.next_call_date ? new Date(customer.next_call_date).toLocaleDateString('tr-TR') : 'Belirlenmedi'}
                    </TableCell>
                    <TableCell>
                      {customer.last_visit_date ? new Date(customer.last_visit_date).toLocaleDateString('tr-TR') : 'Henüz ziyaret yapılmadı'}
                    </TableCell>
                    <TableCell>
                      {customer.next_visit_date ? new Date(customer.next_visit_date).toLocaleDateString('tr-TR') : 'Belirlenmedi'}
                    </TableCell>
                    <TableCell>
                      <CustomerActions customer={customer} onUpdate={fetchCustomers} />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Düzenle">
                        <IconButton size="small" sx={{ mr: 1 }} onClick={() => handleOpen(customer)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Sil">
                        <IconButton size="small" color="error" onClick={() => handleDelete(customer)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingCustomer ? 'Müşteriyi Düzenle' : 'Yeni Müşteri'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="İsim"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Şirket"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Adres"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Sektör"
                value={formData.sector}
                onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Arama Aralığı (Gün)"
                type="number"
                value={formData.callInterval}
                onChange={(e) => setFormData({ ...formData, callInterval: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Ziyaret Aralığı (Gün)"
                type="number"
                value={formData.visitInterval}
                onChange={(e) => setFormData({ ...formData, visitInterval: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notlar"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                multiline
                rows={3}
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1">Ürünler</Typography>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={handleAddProduct}
                >
                  Ürün Ekle
                </Button>
              </Box>
              {formData.products.map((product, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <TextField
                    fullWidth
                    label="Ürün Adı"
                    value={product.name}
                    onChange={(e) => handleProductChange(index, 'name', e.target.value)}
                  />
                  <TextField
                    fullWidth
                    label="Ortalama Tonaj"
                    type="number"
                    value={product.averageTonnage}
                    onChange={(e) => handleProductChange(index, 'averageTonnage', e.target.value)}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">ton</InputAdornment>,
                    }}
                  />
                  <IconButton
                    color="error"
                    onClick={() => handleRemoveProduct(index)}
                    disabled={formData.products.length === 1}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>İptal</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingCustomer ? 'Güncelle' : 'Ekle'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 