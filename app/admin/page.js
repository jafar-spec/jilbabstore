"use client";
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Barcode from 'react-barcode';
import Image from 'next/image';
import { amiriBase64 } from '@/lib/fonts/amiriBase64';
import emailjs from '@emailjs/browser';
import { useToast } from '@/context/ToastContext';
import { 
  getAllOrders, getProducts, createProduct, updateProduct, deleteProductDoc, updateOrderDoc, deleteOrderDoc,
  getSections, createSection, deleteSectionDoc, getNewsletterSubscribers,
  getStoreSettings, updateStoreSettings,
  getAllPromoCodes, addPromoCode, deletePromoCode,
  getAllTickets, updateTicket, deleteTicket, updateSectionSubsections,
  updateOrderRouteSequence, getAllReviews, updateReview, deleteReview,

} from '@/lib/db';
import AdminMap from '@/components/AdminMap';
import { useAuth } from '@/context/AuthContext';

// Helper function to compress images before saving as Base64 to avoid huge payloads
const compressImage = (file, maxWidth = 800, maxHeight = 800) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = maxWidth;
        const MAX_HEIGHT = maxHeight;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        // Compress to 0.7 quality webp
        resolve(canvas.toDataURL('image/webp', 0.7));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
};

export default function AdminDashboard() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user, role: authRole, loading: authLoading, logout } = useAuth();
  const [role, setRole] = useState(null); // 'operator' or 'courier'
  const [courierTab, setCourierTab] = useState('to_deliver'); // 'to_deliver' or 'delivered'
  const [activeTab, setActiveTab] = useState('loading'); 
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [sections, setSections] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef(null);
  
  const [inventorySearch, setInventorySearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  // NEWSLETTER STATE
  const [newsletterSearch, setNewsletterSearch] = useState('');
  const [selectedSubscribers, setSelectedSubscribers] = useState([]);
  const [newsletterSubject, setNewsletterSubject] = useState('');
  const [newsletterMessage, setNewsletterMessage] = useState('');
  const [isSendingNewsletter, setIsSendingNewsletter] = useState(false);

  // SECTIONS STATE
  const [newSection, setNewSection] = useState({ title_en: '', title_ar: '', order: 0 });

  // PROMO CODES STATE
  const [promoCodes, setPromoCodes] = useState([]);
  const [newPromo, setNewPromo] = useState({ code: '', discountValue: 0, type: 'fixed' });

  // SUPPORT TICKETS STATE
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // REVIEWS STATE
  const [adminReviews, setAdminReviews] = useState([]);
  const [selectedReview, setSelectedReview] = useState(null);

  const [courierRouteMode, setCourierRouteMode] = useState(false);
  const [routeOrders, setRouteOrders] = useState([]);



  // CMS STATE
  const [cmsSettings, setCmsSettings] = useState({
    storeName: '',
    heroTitle: '',
    heroSubtitle: '',
    heroTitle_ar: '',
    heroTitle_en: '',
    heroTitle_he: '',
    heroSubtitle_ar: '',
    heroSubtitle_en: '',
    heroSubtitle_he: '',
    logoUrl: '',
    heroImgLeft: '',
    heroImgMiddle: '',
    heroImgRight: ''
  });
  const [isSavingCms, setIsSavingCms] = useState(false);

  // CUSTOMER & INTERACTIVE ANALYTICS STATE
  const [searchCustomerQuery, setSearchCustomerQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [analyticsMetricMode, setAnalyticsMetricMode] = useState('revenue');
  const [customerSortField, setCustomerSortField] = useState('clv');

  // NEW PRODUCT FORM STATE
  const [newProduct, setNewProduct] = useState({
    title: '',
    price: '',
    images: [], 
    description: '',
    sectionId: '',
    category: '',
    variants: [] // Array of { size: '', stock: 0 }
  });

  const availableSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'One Size'];

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (!authLoading && user && authRole) {
      if (authRole === 'courier') {
        // Couriers must never see the admin panel
        router.push('/courier');
      } else if (authRole === 'operator') {
        setRole('operator');
        setActiveTab('dashboard');
        fetchData();
      } else {
        router.push('/');
      }
    }
  }, [user, authLoading, authRole, router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [fetchedOrders, fetchedProducts, fetchedSections, fetchedSubscribers, fetchedSettings, fetchedPromoCodes, fetchedTickets, fetchedReviews] = await Promise.all([
        getAllOrders(),
        getProducts(),
        getSections(),
        getNewsletterSubscribers(),
        getStoreSettings(),
        getAllPromoCodes(),
        getAllTickets(),
        getAllReviews(),
      ]);
      setOrders(fetchedOrders);
      setProducts(fetchedProducts);
      setSections(fetchedSections);
      setSubscribers(fetchedSubscribers);
      setPromoCodes(fetchedPromoCodes || []);
      setTickets(fetchedTickets || []);
      setAdminReviews(fetchedReviews || []);
      
      if (fetchedSettings) {
        setCmsSettings(fetchedSettings);
      }
      
      // Set default section for new product form if none is set
      if (fetchedSections.length > 0) {
        setNewProduct(prev => ({ ...prev, sectionId: fetchedSections[0].id }));
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      showToast("حدث خطأ أثناء الاتصال بقاعدة البيانات", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    // Full reload to clear all cached state. replaceState prevents back-button returning here.
    window.location.replace('/login');
  };



  // --- SECTIONS LOGIC ---
  const handleAddSection = async (e) => {
    e.preventDefault();
    if (!newSection.title_en || !newSection.title_ar) return;
    try {
      await createSection(newSection);
      showToast('تمت إضافة القسم بنجاح', 'success');
      setNewSection({ title_en: '', title_ar: '', order: sections.length + 1 });
      fetchData();
    } catch (err) {
      showToast('فشل في إضافة القسم', 'error');
    }
  };

  const handleDeleteSection = async (id) => {
    if(window.confirm('هل أنت متأكد من حذف هذا القسم؟ (لن يتم حذف المنتجات التابعة له)')) {
      try {
        await deleteSectionDoc(id);
        setSections(sections.filter(s => s.id !== id));
        showToast('تم الحذف', 'success');
      } catch(err) {
        showToast('فشل الحذف', 'error');
      }
    }
  };

  const handleDeleteOrder = async (id) => {
    if (window.confirm('⚠️ تحذير: هل أنت متأكد من حذف هذا الطلب نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.')) {
      try {
        await deleteOrderDoc(id);
        setOrders(orders.filter(o => o.id !== id));
        setSelectedOrder(null);
        showToast('تم حذف الطلب بنجاح', 'success');
      } catch(err) {
        showToast('فشل حذف الطلب', 'error');
      }
    }
  };

  const handleUpdateTracking = async (id, trackingId) => {
    try {
      await updateOrderDoc(id, { trackingId });
      setOrders(orders.map(o => o.id === id ? { ...o, trackingId } : o));
      setSelectedOrder(prev => ({ ...prev, trackingId }));
      showToast('تم تحديث رقم التتبع', 'success');
    } catch(err) {
      showToast('فشل تحديث رقم التتبع', 'error');
    }
  };

  // --- COURIER ROUTING LOGIC ---
  const handleDragStart = (e, index) => {
    e.dataTransfer.setData('dragIndex', index);
  };

  const handleDrop = (e, dropIndex) => {
    const dragIndex = parseInt(e.dataTransfer.getData('dragIndex'), 10);
    if (dragIndex === dropIndex) return;

    const updatedRoutes = [...routeOrders];
    const [draggedItem] = updatedRoutes.splice(dragIndex, 1);
    updatedRoutes.splice(dropIndex, 0, draggedItem);
    
    setRouteOrders(updatedRoutes);
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // necessary to allow dropping
  };

  const saveCourierRoute = async () => {
    try {
      const updates = routeOrders.map((o, idx) => ({ id: o.id, routeOrder: idx }));
      await updateOrderRouteSequence(updates);
      setOrders(orders.map(o => {
        const update = updates.find(u => u.id === o.id);
        return update ? { ...o, routeOrder: update.routeOrder } : o;
      }));
      showToast('تم حفظ خط التوزيع بنجاح', 'success');
      setCourierRouteMode(false);
    } catch (err) {
      showToast('فشل حفظ خط التوزيع', 'error');
    }
  };

  const toggleCourierRouteMode = () => {
    if (!courierRouteMode) {
      // Initialize routeOrders with current out for delivery orders sorted by existing routeOrder or fallback to date
      const toDeliver = orders.filter(o => o.status === 'جاري التوصيل');
      toDeliver.sort((a, b) => (a.routeOrder || 0) - (b.routeOrder || 0));
      setRouteOrders(toDeliver);
    }
    setCourierRouteMode(!courierRouteMode);
  };
  // --- PRODUCTS LOGIC ---
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    // Limit to 4 images to avoid hitting document size limits too easily
    if (newProduct.images.length + files.length > 4) {
      showToast('الحد الأقصى للصور هو 4', 'error');
      return;
    }

    try {
      const compressedImages = await Promise.all(files.map(file => compressImage(file)));
      setNewProduct(prev => ({ ...prev, images: [...prev.images, ...compressedImages] }));
    } catch (err) {
      showToast('حدث خطأ أثناء رفع الصور', 'error');
    }
  };

  const removeImage = (index) => {
    setNewProduct(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const addVariant = (size) => {
    if (!newProduct.variants.find(v => v.size === size)) {
      setNewProduct(prev => ({
        ...prev,
        variants: [...prev.variants, { size, stock: 1 }]
      }));
    }
  };

  const updateVariantStock = (size, newStock) => {
    setNewProduct(prev => ({
      ...prev,
      variants: prev.variants.map(v => v.size === size ? { ...v, stock: parseInt(newStock) || 0 } : v)
    }));
  };

  const removeVariant = (size) => {
    setNewProduct(prev => ({
      ...prev,
      variants: prev.variants.filter(v => v.size !== size)
    }));
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.title || !newProduct.price) return;
    if (newProduct.variants.length === 0) {
      showToast("يرجى اختيار مقاس واحد وتحديد الكمية على الأقل.", "error");
      return;
    }
    if (newProduct.images.length === 0) {
      showToast("يرجى رفع صورة واحدة على الأقل.", "error");
      return;
    }
    
    setLoading(true);
    try {
      // Generate SKUs for variants
      const variantsWithSku = newProduct.variants.map(v => ({
          ...v,
          sku: `SKU-${Math.floor(Math.random() * 90000) + 10000}-${v.size}`
      }));

      const newBaseProduct = {
          title: newProduct.title,
          price: parseFloat(newProduct.price),
          images: newProduct.images,
          description: newProduct.description,
          sectionId: newProduct.sectionId || (sections[0]?.id || ''),
          category: newProduct.category,
          isNewArrival: true,
          variants: variantsWithSku
      };

      await createProduct(newBaseProduct);
      
      showToast(`تمت إضافة المنتج بنجاح!`, "success");
      setNewProduct({ title: '', price: '', images: [], description: '', sectionId: sections[0]?.id || '', category: '', variants: [] });
      if (fileInputRef.current) fileInputRef.current.value = "";
      await fetchData(); 
    } catch (error) {
      console.error("Error adding product:", error);
      showToast('حدث خطأ أثناء إضافة المنتج. قد تكون الصور كبيرة جداً.', "error");
    } finally {
      setLoading(false);
    }
  };

  const updateProductStock = async (baseId, sku, newStock) => {
    if (newStock < 0) return;
    const prodToUpdate = products.find(p => p.id === baseId);
    if (!prodToUpdate) return;
    
    let updatedData;
    if (prodToUpdate.variants) {
      const updatedVariants = prodToUpdate.variants.map(v => 
        v.sku === sku ? { ...v, stock: newStock } : v
      );
      updatedData = { variants: updatedVariants };
    } else {
      updatedData = { stock: newStock };
    }

    try {
      await updateProduct(baseId, updatedData);
      setProducts(products.map(p => p.id === baseId ? { ...p, ...updatedData } : p));
    } catch (err) {
      showToast("فشل تحديث المخزون", "error");
    }
  };

  const deleteProduct = async (baseId) => {
    if (window.confirm("هل أنت متأكد من حذف هذا المنتج نهائياً؟")) {
      try {
        await deleteProductDoc(baseId);
        setProducts(products.filter(prod => prod.id !== baseId));
        showToast('تم حذف المنتج بنجاح', 'success');
      } catch (err) {
        showToast("فشل الحذف", "error");
      }
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await updateOrderDoc(orderId, { status: newStatus });
      const currentOrder = orders.find(o => o.id === orderId);
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ));
      showToast(`تم تحديث الحالة إلى: ${newStatus}`, 'success');

      // Send email if applicable
      const customerEmail = currentOrder?.shipping?.email || currentOrder?.customerInfo?.email;
      if (customerEmail && (newStatus === 'جاري التوصيل' || newStatus === 'تم التوصيل')) {
        let subject = '';
        let htmlContent = '';
        const orderNum = orderId.slice(0, 8);
        
        if (newStatus === 'جاري التوصيل') {
          subject = `Your Order #${orderNum} is Out for Delivery!`;
          htmlContent = `<div style="font-family:sans-serif; text-align:center; padding:20px;">
            <h2 style="color:#7c3aed;">Great news!</h2>
            <p>Your Jilbab Store order <strong>#${orderNum}</strong> is out for delivery with our courier.</p>
            <p>Please keep your phone available. We will contact you soon!</p>
          </div>`;
        } else if (newStatus === 'تم التوصيل') {
          subject = `Your Order #${orderNum} has been Delivered!`;
          htmlContent = `<div style="font-family:sans-serif; text-align:center; padding:20px;">
            <h2 style="color:#27ae60;">Delivered!</h2>
            <p>Your Jilbab Store order <strong>#${orderNum}</strong> has been successfully delivered.</p>
            <p>Thank you for shopping with us! We hope you love your purchase.</p>
          </div>`;
        }

        try {
          // get current auth token
          const { auth } = await import('@/lib/firebase');
          const token = await auth.currentUser?.getIdToken();

          await fetch('/api/send-email', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({
              to: customerEmail,
              subject,
              html: htmlContent
            })
          });
        } catch (emailErr) {
          console.error("Failed to send email notification", emailErr);
        }
      }

    } catch (err) {
      showToast("فشل تحديث حالة الطلب", "error");
    }
  };

  const exportToCSV = () => {
    if (orders.length === 0) return alert('لا توجد طلبات لتصديرها');
    const headers = ['Order ID', 'Tracking ID', 'Date', 'Customer Name', 'Phone', 'Alt Phone', 'City', 'Neighborhood', 'Street', 'Floor', 'Notes', 'Total (NIS)', 'Status'];
    const rows = orders.map(order => {
      const addr = order.shipping || order.customerInfo || {};
      return [
        order.id,
        order.trackingId || '',
        new Date(order.createdAt).toLocaleDateString('en-GB'),
        addr.fullName || '',
        addr.phone1 || addr.phone || '',
        addr.phone2 || '',
        addr.city || '',
        addr.neighborhood || '',
        addr.street || '',
        addr.buildingFloor || '',
        addr.notes || '',
        order.total || 0,
        order.status
      ];
    });

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers.join(",") + "\n" + rows.map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `orders_export_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    if (orders.length === 0) return alert('لا توجد طلبات لتصديرها');
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Delivery Manifest', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 14, 30);

    const tableColumn = ["Order ID", "Tracking #", "Customer", "Phone", "Address", "Amount", "Status"];
    const tableRows = [];

    const ordersToExport = role === 'courier' ? orders.filter(o => o.status === 'جاري التوصيل') : orders;
    ordersToExport.forEach(order => {
      const addr = order.shipping || order.customerInfo || {};
      const orderData = [
        order.id,
        order.trackingId || 'N/A',
        addr.fullName || 'N/A',
        `${addr.phone1 || addr.phone || ''} ${addr.phone2 ? '/ ' + addr.phone2 : ''}`,
        `${addr.city || ''}, ${addr.neighborhood || ''}, ${addr.street || ''}`,
        `${order.total?.toFixed(2)} NIS`,
        order.status
      ];
      tableRows.push(orderData);
    });

    const y = 30;
    
    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: y,
      styles: { font: 'Amiri-Regular', halign: 'right' },
      headStyles: { fillColor: [44, 62, 80] }
    });
    
    doc.save('orders.pdf');
  };

  // --- Newsletter Functions ---

  const handleSelectAllSubscribers = (e) => {
    if (e.target.checked) {
      setSelectedSubscribers(filteredSubscribers.map(sub => sub.email));
    } else {
      setSelectedSubscribers([]);
    }
  };

  const handleSelectSubscriber = (email) => {
    if (selectedSubscribers.includes(email)) {
      setSelectedSubscribers(selectedSubscribers.filter(e => e !== email));
    } else {
      setSelectedSubscribers([...selectedSubscribers, email]);
    }
  };

  const handleSendNewsletter = async (e) => {
    e.preventDefault();
    if (selectedSubscribers.length === 0) {
      showToast("يرجى تحديد مشترك واحد على الأقل / Please select at least one subscriber", "error");
      return;
    }
    if (!newsletterSubject || !newsletterMessage) {
      showToast("يرجى تعبئة عنوان ورسالة النشرة / Please fill subject and message", "error");
      return;
    }

    setIsSendingNewsletter(true);
    let successCount = 0;
    let failCount = 0;

    for (const email of selectedSubscribers) {
      try {
        await emailjs.send(
          'service_5juk9zr', // Service ID
          'template_4r1ab3o', // Template ID
          {
            to_email: email,
            subject: newsletterSubject,
            message: newsletterMessage,
          },
          'DE0aqc893NCUM2_kY' // Public Key
        );
        successCount++;
      } catch (err) {
        console.error("Failed to send to:", email, err);
        alert("EmailJS Error for " + email + ": " + JSON.stringify(err));
        failCount++;
      }
    }

    setIsSendingNewsletter(false);
    if (successCount > 0) {
      showToast(`تم إرسال النشرة إلى ${successCount} مشترك بنجاح!`, "success");
      setNewsletterSubject('');
      setNewsletterMessage('');
      setSelectedSubscribers([]);
    }
    if (failCount > 0) {
      showToast(`فشل الإرسال إلى ${failCount} مشترك`, "error");
    }
  };

  // --- CMS FUNCTIONS ---
  const handleCmsSubmit = async (e) => {
    e.preventDefault();
    setIsSavingCms(true);
    try {
      await updateStoreSettings(cmsSettings);
      showToast("تم تحديث إعدادات المتجر بنجاح!", "success");
    } catch (error) {
      console.error(error);
      showToast("فشل تحديث الإعدادات", "error");
    } finally {
      setIsSavingCms(false);
    }
  };

  const handleCmsImageUpload = async (e, field) => {
    const file = e.target.files[0];
    if (file) {
      try {
        // Compress CMS images slightly larger (1600px) but still under 1MB limit for Firestore
        const compressedBase64 = await compressImage(file, 1600, 1600);
        setCmsSettings(prev => ({ ...prev, [field]: compressedBase64 }));
      } catch (err) {
        console.error("Error compressing CMS image", err);
        showToast("فشل ضغط الصورة", "error");
      }
    }
  };

  const allInventoryItems = products.flatMap(p => 
    p.variants 
      ? p.variants.map(v => ({ ...p, size: v.size, sku: v.sku, stock: v.stock, baseId: p.id }))
      : [{ ...p, baseId: p.id }]
  );

  const filteredInventory = allInventoryItems.filter(p => 
    p.title?.toLowerCase().includes(inventorySearch.toLowerCase()) || 
    p.sku?.toLowerCase().includes(inventorySearch.toLowerCase())
  );

  const filteredSubscribers = subscribers.filter(s => 
    s.email.toLowerCase().includes(newsletterSearch.toLowerCase())
  );

  // --- INTERACTIVE ANALYTICS & CUSTOMER COMPILING METRICS ---
  
  // 1. Group revenue/order trends dynamically for the past 7 days
  const getRecentSalesData = () => {
    const data = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
      data[dateStr] = { revenue: 0, count: 0 };
    }
    
    orders.forEach(o => {
      const orderDate = new Date(o.date || o.createdAt);
      if (isNaN(orderDate.getTime())) return;
      const dateStr = orderDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
      if (data[dateStr]) {
        data[dateStr].revenue += o.total || 0;
        data[dateStr].count += 1;
      }
    });
    
    return Object.entries(data).map(([day, val]) => ({ day, ...val }));
  };

  const recentSales = getRecentSalesData();
  const maxRevenueVal = Math.max(...recentSales.map(r => r.revenue), 1);
  const maxOrdersVal = Math.max(...recentSales.map(r => r.count), 1);

  // 2. Calculate actual Best Sellers by summing ordered item quantities
  const getRealBestSellers = () => {
    const productSales = {};
    orders.forEach(o => {
      if (!o.items) return;
      o.items.forEach(item => {
        if (!item.id) return;
        if (!productSales[item.id]) {
          productSales[item.id] = { 
            qty: 0, 
            revenue: 0, 
            title: item.title, 
            image: item.images?.[0] || item.image || '/assets/black_jilbab_1779926556174.png' 
          };
        }
        productSales[item.id].qty += item.quantity || 1;
        productSales[item.id].revenue += (item.price || 0) * (item.quantity || 1);
      });
    });

    return Object.entries(productSales)
      .map(([id, val]) => ({ id, ...val }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  };
  const realBestSellers = getRealBestSellers();

  // 3. Low stock and Out of stock totals
  const lowStockItemsCount = allInventoryItems.filter(item => item.stock > 0 && item.stock <= 5).length;
  const outOfStockItemsCount = allInventoryItems.filter(item => item.stock === 0).length;

  // 4. Compile customer database profiles dynamically from all orders
  const getCustomerProfiles = () => {
    const customerMap = {};
    orders.forEach(o => {
      const customer = o.customerInfo || o.shipping || {};
      // Use phone number as unique identifier
      const phoneKey = (customer.phone || customer.phone1 || '').trim().replace(/\s+/g, '');
      if (!phoneKey) return;

      if (!customerMap[phoneKey]) {
        customerMap[phoneKey] = {
          key: phoneKey,
          fullName: customer.fullName || 'عميل غير مسمى',
          phone: customer.phone || customer.phone1 || '',
          email: customer.email || 'لا يوجد بريد',
          city: customer.city || 'غير محدد',
          address: customer.address || `${customer.neighborhood || ''} ${customer.street || ''} ${customer.buildingFloor || ''}`,
          totalSpent: 0,
          ordersCount: 0,
          ordersList: [],
          lastPurchaseDate: null
        };
      }

      const profile = customerMap[phoneKey];
      profile.totalSpent += o.total || 0;
      profile.ordersCount += 1;
      profile.ordersList.push(o);

      const orderDate = new Date(o.date || o.createdAt);
      if (!profile.lastPurchaseDate || orderDate > new Date(profile.lastPurchaseDate)) {
        profile.lastPurchaseDate = o.date || o.createdAt;
      }
    });

    let profiles = Object.values(customerMap);

    // Apply Live Search Filter
    if (searchCustomerQuery.trim()) {
      const q = searchCustomerQuery.toLowerCase();
      profiles = profiles.filter(p => 
        p.fullName.toLowerCase().includes(q) ||
        p.phone.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q)
      );
    }

    // Apply Sorting
    if (customerSortField === 'clv') {
      profiles.sort((a, b) => b.totalSpent - a.totalSpent);
    } else if (customerSortField === 'ordersCount') {
      profiles.sort((a, b) => b.ordersCount - a.ordersCount);
    } else if (customerSortField === 'recent') {
      profiles.sort((a, b) => new Date(b.lastPurchaseDate) - new Date(a.lastPurchaseDate));
    }

    return profiles;
  };
  
  const customerProfiles = getCustomerProfiles();

  // Legacy variables mapping for backwards compatibility
  const totalRevenue = orders.reduce((acc, o) => acc + (o.total || 0), 0);
  const pendingOrders = orders.filter(o => o.status.includes('قيد المعالجة'));
  const pendingOrdersCount = pendingOrders.length;
  const bestSellers = realBestSellers;

  if (!role || activeTab === 'loading') {
    return <div style={{ display: 'flex', minHeight: '100vh', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-color)' }}>جاري التحقق من الصلاحيات...</div>;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-color)' }} className="admin-layout">
      {/* Admin Sidebar */}
      <aside className="admin-sidebar">
        <h2 style={{ color: 'var(--accent-color)', marginBottom: '0.5rem', fontSize: '1.5rem' }}>Jilbabstore Admin</h2>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          مرحباً بك، {role === 'operator' ? 'مدير المتجر' : 'مندوب التوصيل'}
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {role === 'operator' && (
            <>
              <button onClick={() => setActiveTab('dashboard')} style={navButtonStyle(activeTab === 'dashboard')}>
                <i className="fa-solid fa-chart-line" style={{ marginLeft: '10px' }}></i> لوحة التحكم
              </button>
              <button onClick={() => setActiveTab('orders')} style={navButtonStyle(activeTab === 'orders')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <span><i className="fa-solid fa-shopping-bag" style={{ marginLeft: '10px' }}></i> إدارة الطلبات</span>
                  <div style={{ position: 'relative' }}>
                    <i className="fa-solid fa-bell" style={{ fontSize: '1.2rem', color: orders.filter(o => o.status === 'قيد المعالجة' || o.status === 'قيد المعالجة (مدفوع)').length > 0 ? '#e74c3c' : 'var(--text-secondary)', transition: '0.3s' }}></i>
                    {orders.filter(o => o.status === 'قيد المعالجة' || o.status === 'قيد المعالجة (مدفوع)').length > 0 && (
                      <span style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#e74c3c', color: 'white', padding: '2px 6px', borderRadius: '50%', fontSize: '0.7rem', fontWeight: 'bold', border: '2px solid var(--surface-color)' }}>
                        {orders.filter(o => o.status === 'قيد المعالجة' || o.status === 'قيد المعالجة (مدفوع)').length}
                      </span>
                    )}
                  </div>
                </div>
              </button>
              <button onClick={() => setActiveTab('inventory')} style={navButtonStyle(activeTab === 'inventory')}>
                <i className="fa-solid fa-boxes-stacked" style={{ marginLeft: '10px' }}></i> إدارة المخزون
              </button>
              <button onClick={() => setActiveTab('products')} style={navButtonStyle(activeTab === 'products')}>
                <i className="fa-solid fa-plus-circle" style={{ marginLeft: '10px' }}></i> إضافة منتج
              </button>
              <button onClick={() => setActiveTab('sections')} style={navButtonStyle(activeTab === 'sections')}>
                <i className="fa-solid fa-list" style={{ marginLeft: '10px' }}></i> أقسام المتجر (Sections)
              </button>

              <button onClick={() => setActiveTab('map')} style={navButtonStyle(activeTab === 'map')}>
                <i className="fa-solid fa-map-location-dot" style={{ marginLeft: '10px' }}></i> خريطة التوزيع
              </button>

              <button onClick={() => setActiveTab('newsletter')} style={navButtonStyle(activeTab === 'newsletter')}>
                <i className="fa-solid fa-envelope" style={{ marginLeft: '10px' }}></i> النشرة البريدية
              </button>
              <button onClick={() => setActiveTab('cms')} style={navButtonStyle(activeTab === 'cms')}>
                <i className="fa-solid fa-pen-to-square" style={{ marginLeft: '10px' }}></i> إدارة المحتوى (CMS)
              </button>
              <button onClick={() => setActiveTab('promos')} style={navButtonStyle(activeTab === 'promos')}>
                <i className="fa-solid fa-tags" style={{ marginLeft: '10px' }}></i> كوبونات الخصم
              </button>
              <button onClick={() => setActiveTab('tickets')} style={navButtonStyle(activeTab === 'tickets')}>
                <i className="fa-solid fa-headset" style={{ marginLeft: '10px' }}></i> تذاكر الدعم
                {/* Show unread count badge if needed */}
              </button>
              <button onClick={() => setActiveTab('reviews')} style={navButtonStyle(activeTab === 'reviews')}>
                <i className="fa-solid fa-star" style={{ marginLeft: '10px' }}></i> التقييمات
              </button>
              <button onClick={() => setActiveTab('customers')} style={navButtonStyle(activeTab === 'customers')}>
                <i className="fa-solid fa-users" style={{ marginLeft: '10px' }}></i> قاعدة العملاء والمشتريات
              </button>
            </>
          )}

          <div style={{ marginTop: 'auto', paddingTop: '2rem', borderTop: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button onClick={handleLogout} style={{ display: 'block', width: '100%', textAlign: 'center', padding: '1rem', background: 'rgba(231, 76, 60, 0.1)', border: '1px solid #e74c3c', borderRadius: '8px', color: '#e74c3c', cursor: 'pointer' }}>
              <i className="fa-solid fa-sign-out-alt" style={{ marginLeft: '10px' }}></i> تسجيل الخروج
            </button>
            <Link href="/" style={{ display: 'block', textAlign: 'center', padding: '1rem', background: 'rgba(0,0,0,0.05)', borderRadius: '8px', color: 'var(--text-secondary)' }}>
              <i className="fa-solid fa-store" style={{ marginLeft: '10px' }}></i> العودة للمتجر
            </Link>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        <header className="admin-header">
          <h1 style={{ fontSize: '2rem', color: 'var(--text-primary)' }}>
             {activeTab === 'dashboard' ? 'التحليلات والمبيعات (Analytics)' :
              activeTab === 'sections' ? 'أقسام المتجر' :
              activeTab === 'products' ? 'إضافة منتج الجديد' : 
              activeTab === 'inventory' ? 'إدارة مخزون المنتجات' : 
              activeTab === 'newsletter' ? 'مشتركو النشرة البريدية' :
              activeTab === 'cms' ? 'إدارة المحتوى (CMS)' :
              activeTab === 'promos' ? 'كوبونات الخصم والترويج' :
              activeTab === 'customers' ? 'قاعدة بيانات العملاء والمشتريات' :
              activeTab === 'orders' ? 'إدارة الطلبات الواردة' : 
              activeTab === 'delivery' ? 'طلبات التوصيل الخاصة بك' : 'بيانات التوصيل والتوزيع'}
          </h1>
          
          {(activeTab === 'orders' || activeTab === 'delivery') && (
            <div className="export-buttons">
              <button onClick={exportToCSV} className="btn-primary" style={{ padding: '0.8rem 1.5rem', background: orders.length === 0 ? 'var(--text-secondary)' : '#217346', color: 'white', opacity: orders.length === 0 ? 0.5 : 1, cursor: orders.length === 0 ? 'not-allowed' : 'pointer' }}>
                <i className="fa-solid fa-file-excel"></i> <span className="hide-mobile">Excel</span>
              </button>
              <button onClick={exportToPDF} className="btn-primary" style={{ padding: '0.8rem 1.5rem', background: orders.length === 0 ? 'var(--text-secondary)' : '#F40F02', color: 'white', opacity: orders.length === 0 ? 0.5 : 1, cursor: orders.length === 0 ? 'not-allowed' : 'pointer' }}>
                <i className="fa-solid fa-file-pdf"></i> <span className="hide-mobile">PDF</span>
              </button>
            </div>
          )}
        </header>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '3rem', color: 'var(--accent-color)' }}></i>
            <p style={{ marginTop: '1rem', color: 'var(--text-primary)' }}>جاري التحميل...</p>
          </div>
        ) : (
          <div>
            {/* DASHBOARD TAB */}
            {activeTab === 'dashboard' && role === 'operator' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                {/* Advanced Top metrics Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
                  {/* Revenue Card */}
                  <div style={{ background: 'rgba(44, 43, 41, 0.03)', border: '1px solid var(--glass-border)', padding: '1.5rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ background: 'rgba(182, 95, 74, 0.1)', color: 'var(--accent-color)', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifycontent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
                      <i className="fa-solid fa-money-bill-wave"></i>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>إجمالي المبيعات</span>
                      <strong style={{ fontSize: '1.6rem', color: 'var(--text-primary)', fontWeight: '700' }}>₪{totalRevenue.toFixed(2)}</strong>
                    </div>
                  </div>

                  {/* Orders Card */}
                  <div style={{ background: 'rgba(44, 43, 41, 0.03)', border: '1px solid var(--glass-border)', padding: '1.5rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ background: 'rgba(52, 152, 219, 0.1)', color: '#3498db', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifycontent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
                      <i className="fa-solid fa-shopping-cart"></i>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>إجمالي الطلبات</span>
                      <strong style={{ fontSize: '1.6rem', color: 'var(--text-primary)', fontWeight: '700' }}>{orders.length}</strong>
                    </div>
                  </div>

                  {/* AOV Card */}
                  <div style={{ background: 'rgba(44, 43, 41, 0.03)', border: '1px solid var(--glass-border)', padding: '1.5rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ background: 'rgba(155, 89, 182, 0.1)', color: '#9b59b6', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifycontent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
                      <i className="fa-solid fa-calculator"></i>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>متوسط الطلب (AOV)</span>
                      <strong style={{ fontSize: '1.6rem', color: 'var(--text-primary)', fontWeight: '700' }}>₪{(totalRevenue / Math.max(orders.length, 1)).toFixed(2)}</strong>
                    </div>
                  </div>

                  {/* Customers Count Card */}
                  <div style={{ background: 'rgba(44, 43, 41, 0.03)', border: '1px solid var(--glass-border)', padding: '1.5rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ background: 'rgba(46, 204, 113, 0.1)', color: '#2ecc71', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifycontent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
                      <i className="fa-solid fa-users"></i>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>العملاء النشطون</span>
                      <strong style={{ fontSize: '1.6rem', color: 'var(--text-primary)', fontWeight: '700' }}>{customerProfiles.length}</strong>
                    </div>
                  </div>

                  {/* Stock Status Card */}
                  <div style={{ background: 'rgba(44, 43, 41, 0.03)', border: '1px solid var(--glass-border)', padding: '1.5rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ background: 'rgba(230, 126, 34, 0.1)', color: '#e67e22', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifycontent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
                      <i className="fa-solid fa-triangle-exclamation"></i>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>تنبيهات المخزون</span>
                      <strong style={{ fontSize: '1.3rem', color: 'var(--text-primary)', fontWeight: '700' }}>
                        {outOfStockItemsCount} <span style={{ fontSize: '0.8rem', color: 'var(--accent-color)', fontWeight: '400' }}>نفد</span> | {lowStockItemsCount} <span style={{ fontSize: '0.8rem', color: '#e67e22', fontWeight: '400' }}>منخفض</span>
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Sales Charts & Action Center split */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
                  
                  {/* Interactive Dynamic Sales Trend Graph */}
                  <div style={{ background: 'var(--surface-color)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', margin: 0 }}><i className="fa-solid fa-chart-bar" style={{ marginLeft: '8px', color: 'var(--accent-color)' }}></i> حركة المبيعات (Trend Chart)</h3>
                      
                      {/* Metric Toggle */}
                      <div style={{ display: 'flex', background: 'rgba(44, 43, 41, 0.05)', padding: '4px', borderRadius: '8px' }}>
                        <button 
                          onClick={() => setAnalyticsMetricMode('revenue')}
                          style={{ padding: '4px 12px', fontSize: '0.8rem', border: 'none', borderRadius: '6px', background: analyticsMetricMode === 'revenue' ? 'var(--text-primary)' : 'transparent', color: analyticsMetricMode === 'revenue' ? 'var(--bg-color)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600', transition: 'all 0.3s' }}
                        >
                          المبيعات (₪)
                        </button>
                        <button 
                          onClick={() => setAnalyticsMetricMode('orders')}
                          style={{ padding: '4px 12px', fontSize: '0.8rem', border: 'none', borderRadius: '6px', background: analyticsMetricMode === 'orders' ? 'var(--text-primary)' : 'transparent', color: analyticsMetricMode === 'orders' ? 'var(--bg-color)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600', transition: 'all 0.3s' }}
                        >
                          الطلبات (عدد)
                        </button>
                      </div>
                    </div>

                    {/* Chart Columns Visualizer */}
                    <div style={{ display: 'flex', height: '220px', alignItems: 'flex-end', justifyContent: 'space-between', borderBottom: '2px solid var(--border-color)', paddingBottom: '10px', position: 'relative', marginTop: '1rem' }}>
                      {recentSales.map((item, idx) => {
                        const val = analyticsMetricMode === 'revenue' ? item.revenue : item.count;
                        const maxVal = analyticsMetricMode === 'revenue' ? maxRevenueVal : maxOrdersVal;
                        const barPercent = Math.min((val / maxVal) * 100, 100);
                        
                        return (
                          <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', group: 'true', position: 'relative' }}>
                            {/* Hover Value Tooltip */}
                            <div style={{
                              position: 'absolute',
                              bottom: `calc(${barPercent}% + 15px)`,
                              background: 'var(--text-primary)',
                              color: 'var(--bg-color)',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              opacity: 0,
                              visibility: 'hidden',
                              transform: 'translateY(10px)',
                              transition: 'all 0.3s',
                              whiteSpace: 'nowrap',
                              zIndex: 10,
                              boxShadow: 'var(--shadow-md)'
                            }}
                            className="chart-tooltip"
                            >
                              {analyticsMetricMode === 'revenue' ? `₪${val.toFixed(2)}` : `${val} طلبيات`}
                            </div>

                            {/* Animated Visual Column */}
                            <div 
                              style={{ 
                                width: '32px', 
                                height: `${Math.max(barPercent, 4)}%`, 
                                background: analyticsMetricMode === 'revenue' ? 'var(--accent-color)' : '#3498db', 
                                borderRadius: '6px 6px 0 0', 
                                transition: 'height 0.8s var(--ease-out-expo), background-color 0.5s',
                                cursor: 'pointer'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = '0.85';
                                const tooltip = e.currentTarget.parentElement?.querySelector('.chart-tooltip');
                                if (tooltip) {
                                  tooltip.style.opacity = '1';
                                  tooltip.style.visibility = 'visible';
                                  tooltip.style.transform = 'translateY(0)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = '1';
                                const tooltip = e.currentTarget.parentElement?.querySelector('.chart-tooltip');
                                if (tooltip) {
                                  tooltip.style.opacity = '0';
                                  tooltip.style.visibility = 'hidden';
                                  tooltip.style.transform = 'translateY(10px)';
                                }
                              }}
                            />
                            
                            {/* Day label */}
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px', fontWeight: '500' }}>{item.day}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quick Product Stock Health & Restock Actions */}
                  <div style={{ background: 'var(--surface-color)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', margin: 0 }}><i className="fa-solid fa-warehouse" style={{ marginLeft: '8px', color: 'var(--accent-color)' }}></i> حالة المخزون والإجراءات السريعة</h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', maxHeight: '220px', paddingLeft: '4px' }}>
                      {allInventoryItems.filter(item => item.stock <= 5).slice(0, 5).map((item, index) => (
                        <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(230, 225, 214, 0.4)', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <img src={item.images?.[0] || item.image || '/assets/black_jilbab_1779926556174.png'} alt={item.title} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px' }} />
                            <div>
                              <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-primary)' }}>{item.title}</strong>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>المقاس: {item.size || 'N/A'} {item.sku && `| SKU: ${item.sku}`}</span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ 
                              padding: '3px 8px', 
                              borderRadius: '9999px', 
                              fontSize: '0.75rem', 
                              fontWeight: '600',
                              background: item.stock === 0 ? 'rgba(231, 76, 60, 0.15)' : 'rgba(230, 126, 34, 0.15)',
                              color: item.stock === 0 ? '#e74c3c' : '#e67e22'
                            }}>
                              {item.stock === 0 ? 'نفد' : `${item.stock} قطع`}
                            </span>
                            
                            {/* Fast Increment Button */}
                            <button 
                              onClick={async () => {
                                const newQty = item.stock + 10;
                                try {
                                  const prod = products.find(p => p.id === item.baseId);
                                  if (prod && prod.variants) {
                                    const updatedVariants = prod.variants.map(v => 
                                      v.size === item.size ? { ...v, stock: newQty } : v
                                    );
                                    await updateProduct(item.baseId, { variants: updatedVariants });
                                    setProducts(products.map(p => 
                                      p.id === item.baseId ? { ...p, variants: updatedVariants } : p
                                    ));
                                    showToast(`تمت إضافة 10 قطع إلى ${item.title}`, "success");
                                  }
                                } catch (e) {
                                  showToast("فشل تحديث المخزون", "error");
                                }
                              }}
                              style={{ border: 'none', background: 'var(--text-primary)', color: 'var(--bg-color)', width: '28px', height: '28px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', transition: 'var(--transition)' }}
                              title="إضافة 10 قطع فوراً"
                              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                              onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                            >
                              <i className="fa-solid fa-plus"></i>
                            </button>
                          </div>
                        </div>
                      ))}
                      
                      {allInventoryItems.filter(item => item.stock <= 5).length === 0 && (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                          <i className="fa-solid fa-circle-check" style={{ color: '#2ecc71', fontSize: '1.5rem', marginBottom: '8px', display: 'block' }}></i>
                          مستوى المخزون ممتاز في جميع المنتجات!
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* Best Sellers Grid */}
                <div style={{ background: 'var(--surface-color)', padding: '2.5rem', borderRadius: '16px', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-sm)' }}>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '1.8rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', color: 'var(--text-primary)' }}><i className="fa-solid fa-fire" style={{ color: '#f1c40f', marginLeft: '8px' }}></i> المنتجات الأكثر مبيعاً ورقماً (Dynamic Best Sellers)</h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
                    {realBestSellers.map((product, idx) => (
                      <div key={idx} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(230, 225, 214, 0.35)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--glass-border)', transition: 'var(--transition)' }}>
                        {/* Popularity Badge */}
                        <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'var(--text-primary)', color: 'var(--bg-color)', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold', zIndex: 3 }}>
                          #{idx + 1}
                        </div>
                        
                        <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', overflow: 'hidden', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
                          <Image 
                            src={product.image} 
                            alt={product.title} 
                            fill
                            style={{ objectFit: 'cover' }} 
                          />
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <strong style={{ fontSize: '1rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.title}</strong>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>الكمية المبيعة: <strong>{product.qty} قطعة</strong></span>
                          <span style={{ fontSize: '0.9rem', color: 'var(--accent-color)', fontWeight: 'bold' }}>إجمالي الإيرادات: ₪{product.revenue.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}

                    {realBestSellers.length === 0 && (
                      <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        لا توجد إحصائيات للمبيعات بعد. سيتم تحديث هذه اللوحة تلقائياً عند استلام الطلبات.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SECTIONS TAB */}
            {activeTab === 'sections' && role === 'operator' && (
              <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: '1fr 2fr' }}>
                <div style={{ background: 'var(--surface-color)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                  <h3>إضافة قسم جديد</h3>
                  <form onSubmit={handleAddSection} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                    <input type="text" placeholder="الاسم (إنجليزي) مثل Women" required value={newSection.title_en} onChange={e => setNewSection({...newSection, title_en: e.target.value})} className="admin-input" />
                    <input type="text" placeholder="الاسم (عربي) مثل نسائي" required value={newSection.title_ar} onChange={e => setNewSection({...newSection, title_ar: e.target.value})} className="admin-input" />
                    <input type="number" placeholder="الترتيب (Order) مثلا 1" value={newSection.order} onChange={e => setNewSection({...newSection, order: parseInt(e.target.value) || 0})} className="admin-input" />
                    <button type="submit" className="btn-primary">حفظ القسم</button>
                  </form>
                </div>
                <div style={{ background: 'var(--surface-color)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                  <h3>الأقسام الحالية والأقسام الفرعية</h3>
                  {sections.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>لا توجد أقسام بعد.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
                      {sections.map(sec => {
                        const subsections = sec.subsections || [];
                        return (
                          <div key={sec.id} style={{ border: '1px solid var(--glass-border)', borderRadius: '12px', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 1.5rem', background: 'var(--bg-color)', alignItems: 'center' }}>
                              <div>
                                <strong style={{ color: 'var(--text-primary)' }}>{sec.title_ar} ({sec.title_en})</strong>
                                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>الترتيب: {sec.order || 0} · {subsections.length} قسم فرعي</span>
                              </div>
                              <button onClick={() => handleDeleteSection(sec.id)} style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer' }}>
                                <i className="fa-solid fa-trash"></i>
                              </button>
                            </div>
                            {/* Sub-sections */}
                            <div style={{ padding: '1rem 1.5rem', background: 'var(--surface-color)' }}>
                              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                الأقسام الفرعية (Sub-sections)
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                                {subsections.map(sub => (
                                  <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '99px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                                    <span>{sub.name_ar} / {sub.name_en}</span>
                                    <button
                                      onClick={async () => {
                                        const updated = subsections.filter(s => s.id !== sub.id);
                                        await updateSectionSubsections(sec.id, updated);
                                        setSections(prev => prev.map(s => s.id === sec.id ? {...s, subsections: updated} : s));
                                        showToast('تم الحذف', 'success');
                                      }}
                                      style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', padding: 0, fontSize: '0.75rem', lineHeight: 1 }}
                                    >
                                      <i className="fa-solid fa-xmark"></i>
                                    </button>
                                  </div>
                                ))}
                              </div>
                              {/* Add sub-section inline form */}
                              <form onSubmit={async (e) => {
                                e.preventDefault();
                                const fd = new FormData(e.target);
                                const newSub = {
                                  id: Date.now().toString(),
                                  name_ar: fd.get('name_ar'),
                                  name_en: fd.get('name_en'),
                                  name_he: fd.get('name_he') || ''
                                };
                                if (!newSub.name_ar && !newSub.name_en) return;
                                const updated = [...subsections, newSub];
                                await updateSectionSubsections(sec.id, updated);
                                setSections(prev => prev.map(s => s.id === sec.id ? {...s, subsections: updated} : s));
                                e.target.reset();
                                showToast('تمت إضافة القسم الفرعي', 'success');
                              }} style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                                <input name="name_ar" placeholder="الاسم عربي" required style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '0.85rem', width: '120px' }} />
                                <input name="name_en" placeholder="English name" style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '0.85rem', width: '130px' }} />
                                <input name="name_he" placeholder="שם עברי" style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '0.85rem', width: '120px' }} />
                                <button type="submit" style={{ padding: '5px 14px', borderRadius: '6px', border: 'none', background: 'var(--accent-color)', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700 }}>
                                  <i className="fa-solid fa-plus"></i> إضافة
                                </button>
                              </form>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* NEWSLETTER TAB */}
            {activeTab === 'newsletter' && role === 'operator' && (
              <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: '1fr 1fr' }}>
                
                {/* List & Selection */}
                <div style={{ background: 'var(--surface-color)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3>قائمة المشتركين ({subscribers.length})</h3>
                  </div>
                  
                  <input 
                    type="text" 
                    placeholder="ابحث بالبريد الإلكتروني..." 
                    value={newsletterSearch} 
                    onChange={(e) => setNewsletterSearch(e.target.value)} 
                    style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--glass-border)', borderRadius: '8px', marginBottom: '1rem' }} 
                  />

                  {filteredSubscribers.length === 0 ? (
                    <EmptyState icon="fa-envelope-open" text="لا يوجد مشتركون." />
                  ) : (
                    <div style={{ overflowY: 'auto', maxHeight: '400px', border: '1px solid var(--glass-border)', borderRadius: '8px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ position: 'sticky', top: 0, background: 'var(--surface-color)' }}>
                          <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'right', color: 'var(--text-secondary)' }}>
                            <th style={{ padding: '1rem', width: '50px' }}>
                              <input 
                                type="checkbox" 
                                checked={selectedSubscribers.length === filteredSubscribers.length && filteredSubscribers.length > 0}
                                onChange={handleSelectAllSubscribers}
                                style={{ transform: 'scale(1.2)' }}
                              />
                            </th>
                            <th style={{ padding: '1rem' }}>البريد الإلكتروني</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSubscribers.map((sub, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--glass-border)', background: selectedSubscribers.includes(sub.email) ? 'rgba(0,0,0,0.02)' : 'transparent' }}>
                              <td style={{ padding: '1rem' }}>
                                <input 
                                  type="checkbox" 
                                  checked={selectedSubscribers.includes(sub.email)}
                                  onChange={() => handleSelectSubscriber(sub.email)}
                                  style={{ transform: 'scale(1.2)' }}
                                />
                              </td>
                              <td style={{ padding: '1rem', fontWeight: 'bold' }}>{sub.email}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Composer */}
                <div style={{ background: 'var(--surface-color)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                  <h3 style={{ marginBottom: '1.5rem' }}>إرسال النشرة البريدية</h3>
                  <form onSubmit={handleSendNewsletter} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ background: 'rgba(0,0,0,0.03)', padding: '1rem', borderRadius: '8px', color: 'var(--text-secondary)' }}>
                      <strong>المستلمون:</strong> {selectedSubscribers.length} مشترك تم تحديده
                    </div>

                    <div>
                      <label className="admin-label">عنوان الرسالة (Subject)</label>
                      <input 
                        type="text" 
                        required 
                        value={newsletterSubject}
                        onChange={e => setNewsletterSubject(e.target.value)}
                        className="admin-input" 
                        placeholder="أحدث عروض المتجر..." 
                      />
                    </div>

                    <div>
                      <label className="admin-label">محتوى الرسالة (Message)</label>
                      <textarea 
                        required 
                        value={newsletterMessage}
                        onChange={e => setNewsletterMessage(e.target.value)}
                        className="admin-input" 
                        rows="8" 
                        placeholder="أهلاً بك في متجرنا..."
                        style={{ resize: 'vertical' }}
                      ></textarea>
                    </div>

                    <button 
                      type="submit" 
                      className="btn-primary" 
                      disabled={isSendingNewsletter || selectedSubscribers.length === 0}
                      style={{ opacity: (isSendingNewsletter || selectedSubscribers.length === 0) ? 0.6 : 1 }}
                    >
                      {isSendingNewsletter ? <><i className="fa-solid fa-spinner fa-spin"></i> جاري الإرسال...</> : <><i className="fa-solid fa-paper-plane"></i> إرسال النشرة</>}
                    </button>
                  </form>
                </div>

              </div>
            )}

            {/* INVENTORY TAB */}
            {activeTab === 'inventory' && role === 'operator' && (
              <div style={{ background: 'var(--surface-color)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                  <input type="text" placeholder="ابحث برمز SKU أو المنتج..." value={inventorySearch} onChange={(e) => setInventorySearch(e.target.value)} style={{ width: '400px', padding: '0.8rem', border: '1px solid var(--glass-border)', borderRadius: '8px' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>إجمالي الأصناف: {products.length}</span>
                </div>

                {filteredInventory.length === 0 ? (
                  <EmptyState icon="fa-boxes-stacked" text="لا توجد منتجات مطابقة في المخزون." />
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'right', color: 'var(--text-secondary)' }}>
                          <th style={{ padding: '1rem' }}>الصورة</th>
                          <th style={{ padding: '1rem' }}>التفاصيل</th>
                          <th style={{ padding: '1rem' }}>SKU</th>
                          <th style={{ padding: '1rem' }}>السعر</th>
                          <th style={{ padding: '1rem' }}>الكمية</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredInventory.map(product => {
                          const primaryImg = (product.images && product.images.length > 0) ? product.images[0] : (product.image || '/assets/black_jilbab_1779926556174.png');
                          return (
                            <tr key={product.sku || product.baseId} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                              <td style={{ padding: '1rem' }}><img src={primaryImg} alt="" style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} /></td>
                              <td style={{ padding: '1rem' }}>
                                <strong>{product.title}</strong><br/>
                                <span style={{ fontSize: '0.8rem' }}>المقاس: <span style={{color: 'var(--accent-color)'}}>{product.size || 'عام'}</span></span>
                              </td>
                              <td style={{ padding: '1rem' }}>{product.sku || 'N/A'}</td>
                              <td style={{ padding: '1rem' }}>₪{Number(product.price).toFixed(2)}</td>
                              <td style={{ padding: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <button onClick={() => updateProductStock(product.baseId, product.sku, (product.stock || 0) - 1)} style={{ width: '30px', height: '30px', borderRadius: '50%', border: '1px solid #ccc' }}>-</button>
                                  <span>{product.stock || 0}</span>
                                  <button onClick={() => updateProductStock(product.baseId, product.sku, (product.stock || 0) + 1)} style={{ width: '30px', height: '30px', borderRadius: '50%', border: '1px solid #ccc' }}>+</button>
                                  <button onClick={() => deleteProduct(product.baseId)} style={{ color: 'red', background: 'none', border: 'none', marginRight: '1rem', cursor: 'pointer' }}><i className="fa-solid fa-trash"></i></button>
                                </div>
                                {product.stock === 0 ? (
                                  <div style={{ marginTop: '0.5rem', display: 'inline-block', padding: '0.2rem 0.5rem', background: '#ffebee', color: '#c62828', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>نفذت الكمية</div>
                                ) : product.stock < 5 ? (
                                  <div style={{ marginTop: '0.5rem', display: 'inline-block', padding: '0.2rem 0.5rem', background: '#fff8e1', color: '#f57f17', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>كمية منخفضة</div>
                                ) : null}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ADD PRODUCT TAB */}
            {activeTab === 'products' && role === 'operator' && (
              <div style={{ background: 'var(--surface-color)', padding: '3rem', borderRadius: '16px', border: '1px solid var(--glass-border)', maxWidth: '900px', margin: '0 auto' }}>
                  <form onSubmit={handleAddProduct} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {/* Multi Image Upload */}
                    <div style={{ border: '2px dashed var(--border-color)', borderRadius: '12px', padding: '2rem', textAlign: 'center', position: 'relative' }}>
                        <i className="fa-solid fa-images" style={{ fontSize: '3rem', color: 'var(--accent-color)', marginBottom: '1rem' }}></i>
                        <p>انقر أو اسحب صور المنتج (بحد أقصى 4 صور)</p>
                        <input type="file" multiple accept="image/*" onChange={handleImageUpload} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                    </div>

                    {/* Image Preview Gallery */}
                    {newProduct.images.length > 0 && (
                      <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', padding: '1rem 0' }}>
                        {newProduct.images.map((img, idx) => (
                          <div key={idx} style={{ position: 'relative', minWidth: '100px', height: '100px' }}>
                            <img src={img} style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px' }} alt="" />
                            <button type="button" onClick={() => removeImage(idx)} style={{ position: 'absolute', top: -5, right: -5, background: 'red', color: 'white', borderRadius: '50%', width: '24px', height: '24px', border: 'none', cursor: 'pointer' }}>×</button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                      <div style={{ flex: '1 1 100%' }}>
                        <label className="admin-label">اسم الموديل</label>
                        <input type="text" value={newProduct.title} onChange={e => setNewProduct({...newProduct, title: e.target.value})} className="admin-input" required />
                      </div>
                      
                      <div style={{ flex: '1 1 200px' }}>
                        <label className="admin-label">السعر (₪)</label>
                        <input type="number" step="0.01" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="admin-input" required />
                      </div>

                      <div style={{ flex: '1 1 200px' }}>
                        <label className="admin-label">القسم (الواجهة الرئيسية)</label>
                        <select value={newProduct.sectionId} onChange={e => setNewProduct({...newProduct, sectionId: e.target.value, subsectionId: ''})} className="admin-input" required>
                          <option value="" disabled>اختر القسم</option>
                          {sections.map(sec => <option key={sec.id} value={sec.id}>{sec.title_ar} ({sec.title_en})</option>)}
                        </select>
                      </div>

                      {/* Sub-section selector — shows only when selected section has subsections */}
                      {(() => {
                        const selectedSec = sections.find(s => s.id === newProduct.sectionId);
                        const subs = selectedSec?.subsections || [];
                        if (subs.length === 0) return null;
                        return (
                          <div style={{ flex: '1 1 200px' }}>
                            <label className="admin-label">القسم الفرعي (Sub-section)</label>
                            <select value={newProduct.subsectionId || ''} onChange={e => setNewProduct({...newProduct, subsectionId: e.target.value})} className="admin-input">
                              <option value="">-- بدون قسم فرعي --</option>
                              {subs.map(sub => <option key={sub.id} value={sub.id}>{sub.name_ar} / {sub.name_en}</option>)}
                            </select>
                          </div>
                        );
                      })()}

                      <div style={{ flex: '1 1 200px' }}>
                        <label className="admin-label">تصنيف إضافي (مثال: جلباب)</label>
                        <input type="text" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="admin-input" />
                      </div>
                    </div>

                    {/* Variant & Stock Configurator */}
                    <div style={{ background: 'var(--bg-color)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                      <label className="admin-label" style={{ marginBottom: '1rem' }}>إضافة المقاسات والكميات</label>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '1rem' }}>
                        {availableSizes.map(size => (
                          <button type="button" key={size} onClick={() => addVariant(size)} style={{ padding: '0.4rem 1rem', borderRadius: '20px', border: '1px solid var(--accent-color)', background: 'transparent', cursor: 'pointer', color: 'var(--text-primary)' }}>+ {size}</button>
                        ))}
                      </div>

                      {newProduct.variants.length > 0 && (
                        <table style={{ width: '100%', marginTop: '1rem', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid #ccc', textAlign: 'right' }}>
                              <th>المقاس</th>
                              <th>الكمية المتوفرة (Stock)</th>
                              <th>إزالة</th>
                            </tr>
                          </thead>
                          <tbody>
                            {newProduct.variants.map((variant, idx) => (
                              <tr key={idx}>
                                <td style={{ padding: '0.5rem 0' }}><strong>{variant.size}</strong></td>
                                <td>
                                  <input type="number" min="0" value={variant.stock} onChange={e => updateVariantStock(variant.size, e.target.value)} style={{ width: '80px', padding: '0.4rem', borderRadius: '4px', border: '1px solid #ccc' }} />
                                </td>
                                <td>
                                  <button type="button" onClick={() => removeVariant(variant.size)} style={{ background: 'none', color: 'red', border: 'none', cursor: 'pointer' }}><i className="fa-solid fa-times"></i></button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>

                    <div>
                      <label className="admin-label">وصف المنتج</label>
                      <textarea value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} className="admin-input" style={{ minHeight: '120px' }} />
                    </div>
                    
                    <button type="submit" className="btn-primary" style={{ marginTop: '1rem', padding: '1rem' }}>إضافة للمخزون وإنشاء الباركود</button>
                  </form>
              </div>
            )}

            {/* ORDERS AND DELIVERY TABS REMAIN SIMILAR (Collapsed for brevity but functional) */}
            {activeTab === 'orders' && role === 'operator' && (
              <div style={{ background: 'var(--surface-color)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--glass-border)', overflowX: 'auto' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                  <h3 style={{ margin: 0 }}>إدارة الطلبات</h3>
                  <button onClick={toggleCourierRouteMode} className={courierRouteMode ? 'btn-primary' : ''} style={{ padding: '0.8rem 1.5rem', borderRadius: '8px', cursor: 'pointer', border: '1px solid var(--accent-color)', background: courierRouteMode ? 'var(--accent-color)' : 'transparent', color: courierRouteMode ? '#fff' : 'var(--text-primary)', fontWeight: 'bold' }}>
                    <i className="fa-solid fa-route"></i> توجيه المندوب (Courier Routing)
                  </button>
                </div>

                {courierRouteMode ? (
                  <div>
                    <div style={{ background: 'rgba(124, 58, 237, 0.1)', border: '1px solid var(--accent-color)', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span><i className="fa-solid fa-info-circle"></i> اسحب وأفلت الطلبات لترتيب مسار التوصيل للمندوب.</span>
                      <button onClick={saveCourierRoute} style={{ padding: '0.6rem 1.2rem', background: '#27ae60', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>حفظ المسار</button>
                    </div>
                    {routeOrders.length === 0 ? <EmptyState icon="fa-truck" text="لا توجد طلبات جاري توصيلها حالياً." /> : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        {routeOrders.map((order, index) => {
                          const addr = order.shipping || order.customerInfo || {};
                          return (
                            <div 
                              key={order.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, index)}
                              onDragOver={handleDragOver}
                              onDrop={(e) => handleDrop(e, index)}
                              style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--bg-color)', border: '1px solid var(--glass-border)', borderRadius: '8px', cursor: 'grab', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                            >
                              <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--text-secondary)', width: '30px', textAlign: 'center' }}>{index + 1}</div>
                              <i className="fa-solid fa-grip-vertical" style={{ color: '#ccc', cursor: 'grab' }}></i>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 'bold' }}>#{order.id.slice(0, 8)} - {addr.fullName || 'غير متوفر'}</div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{addr.city || ''} {addr.neighborhood || ''} {addr.street || ''}</div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  orders.length === 0 ? <EmptyState icon="fa-box-open" text="لا توجد طلبات حتى الآن." /> : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'right', color: 'var(--text-secondary)' }}>
                          <th style={{ padding: '1rem' }}>رقم الطلب</th>
                          <th style={{ padding: '1rem' }}>العميل</th>
                          <th style={{ padding: '1rem' }}>الإجمالي</th>
                          <th style={{ padding: '1rem' }}>طريقة الدفع</th>
                          <th style={{ padding: '1rem' }}>الحالة</th>
                          <th style={{ padding: '1rem' }}>التفاصيل</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map(order => (
                          <tr key={order.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                            <td style={{ padding: '1rem' }}><strong>{order.id}</strong></td>
                            <td style={{ padding: '1rem' }}>{order.shipping?.fullName || order.customerInfo?.fullName || 'غير متوفر'}</td>
                            <td style={{ padding: '1rem', color: 'var(--accent-color)', fontWeight: 'bold' }}>₪{order.total?.toFixed(2)}</td>
                            <td style={{ padding: '1rem' }}>
                              <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600', background: order.paymentMethod === 'cash' ? 'rgba(255,193,7,0.2)' : order.paymentMethod === 'paypal' ? 'rgba(0,119,181,0.2)' : 'rgba(40,167,69,0.2)', color: order.paymentMethod === 'cash' ? '#e6a800' : order.paymentMethod === 'paypal' ? '#0077b5' : '#28a745' }}>
                                {order.paymentMethod === 'cash' ? '💵 عند الاستلام' : order.paymentMethod === 'paypal' ? '🔵 PayPal' : '💳 بطاقة'}
                              </span>
                            </td>
                            <td style={{ padding: '1rem' }}>
                              <select value={order.status} onChange={(e) => updateOrderStatus(order.id, e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--glass-border)' }}>
                                <option value="قيد المعالجة (مدفوع)">قيد المعالجة (مدفوع)</option>
                                <option value="قيد المعالجة (الدفع عند الاستلام)">قيد المعالجة (الدفع عند الاستلام)</option>
                                <option value="قيد المعالجة">قيد المعالجة</option>
                                <option value="جاري التوصيل">جاري التوصيل</option>
                                <option value="تم التوصيل">تم التوصيل</option>
                                <option value="ملغي">ملغي</option>
                              </select>
                            </td>
                            <td style={{ padding: '1rem' }}>
                              <button onClick={() => setSelectedOrder(order)} className="btn-details"><i className="fa-solid fa-eye"></i> عرض</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                )}
              </div>
            )}


            {/* CMS TAB */}
            {activeTab === 'cms' && role === 'operator' && (
              <div style={{ background: 'var(--surface-color)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>إعدادات المحتوى (CMS)</h3>
                <form onSubmit={handleCmsSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  
                   {/* General Settings */}
                   <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                     <div style={{ flex: '1 1 100%' }}>
                       <label className="admin-label">اسم المتجر (Store Name)</label>
                       <input type="text" value={cmsSettings.storeName || ''} onChange={e => setCmsSettings({...cmsSettings, storeName: e.target.value})} className="admin-input" required />
                     </div>

                     {/* Multilingual Hero Titles */}
                     <div style={{ flex: '1 1 100%', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                       <h4 style={{ color: 'var(--accent-color)', marginBottom: '1rem', fontSize: '1.1rem' }}>العناوين الرئيسية للواجهة (Hero Titles - Multilingual)</h4>
                       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem' }}>
                         <div>
                           <label className="admin-label">العنوان بالعربية (Arabic Title)</label>
                           <input type="text" value={cmsSettings.heroTitle_ar || ''} onChange={e => setCmsSettings({...cmsSettings, heroTitle_ar: e.target.value})} className="admin-input" placeholder="مثال: ارتقي بأناقتك." />
                         </div>
                         <div>
                           <label className="admin-label">العنوان بالإنجليزية (English Title)</label>
                           <input type="text" value={cmsSettings.heroTitle_en || ''} onChange={e => setCmsSettings({...cmsSettings, heroTitle_en: e.target.value})} className="admin-input" placeholder="e.g. Elevate your elegance." />
                         </div>
                         <div>
                           <label className="admin-label">العنوان بالعبرية (Hebrew Title)</label>
                           <input type="text" value={cmsSettings.heroTitle_he || ''} onChange={e => setCmsSettings({...cmsSettings, heroTitle_he: e.target.value})} className="admin-input" placeholder="e.g. שדרגי את האלגנטיות שלך." />
                         </div>
                       </div>
                       {/* Backward compatible hidden fallback */}
                       <input type="hidden" value={cmsSettings.heroTitle || ''} />
                     </div>

                     {/* Multilingual Hero Subtitles */}
                     <div style={{ flex: '1 1 100%', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginBottom: '1rem' }}>
                       <h4 style={{ color: 'var(--accent-color)', marginBottom: '1rem', fontSize: '1.1rem' }}>النصوص الفرعية للواجهة (Hero Subtitles - Multilingual)</h4>
                       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem' }}>
                         <div>
                           <label className="admin-label">النص الفرعي بالعربية (Arabic Subtitle)</label>
                           <textarea value={cmsSettings.heroSubtitle_ar || ''} onChange={e => setCmsSettings({...cmsSettings, heroSubtitle_ar: e.target.value})} className="admin-input" rows="3" placeholder="الوصف بالعربية..."></textarea>
                         </div>
                         <div>
                           <label className="admin-label">النص الفرعي بالإنجليزية (English Subtitle)</label>
                           <textarea value={cmsSettings.heroSubtitle_en || ''} onChange={e => setCmsSettings({...cmsSettings, heroSubtitle_en: e.target.value})} className="admin-input" rows="3" placeholder="Description in English..."></textarea>
                         </div>
                         <div>
                           <label className="admin-label">النص الفرعي بالعبرية (Hebrew Subtitle)</label>
                           <textarea value={cmsSettings.heroSubtitle_he || ''} onChange={e => setCmsSettings({...cmsSettings, heroSubtitle_he: e.target.value})} className="admin-input" rows="3" placeholder="Description in Hebrew..."></textarea>
                         </div>
                       </div>
                       {/* Backward compatible hidden fallback */}
                       <input type="hidden" value={cmsSettings.heroSubtitle || ''} />
                     </div>
                   </div>

                  {/* Images Settings */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
                    
                    {/* Logo */}
                    <div style={{ border: '1px solid var(--glass-border)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                      <label className="admin-label">شعار المتجر (Logo)</label>
                      {cmsSettings.logoUrl && <img src={cmsSettings.logoUrl} alt="Logo" style={{ width: '80px', height: '80px', objectFit: 'contain', margin: '1rem auto' }} />}
                      <input type="file" accept="image/*" onChange={(e) => handleCmsImageUpload(e, 'logoUrl')} style={{ fontSize: '0.8rem' }} />
                    </div>

                    {/* Hero Img Left */}
                    <div style={{ border: '1px solid var(--glass-border)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                      <label className="admin-label">صورة الواجهة - يمين (Left)</label>
                      {cmsSettings.heroImgLeft && <img src={cmsSettings.heroImgLeft} alt="Hero Left" style={{ width: '100%', height: '150px', objectFit: 'cover', margin: '1rem auto' }} />}
                      <input type="file" accept="image/*" onChange={(e) => handleCmsImageUpload(e, 'heroImgLeft')} style={{ fontSize: '0.8rem' }} />
                    </div>

                    {/* Hero Img Middle */}
                    <div style={{ border: '1px solid var(--glass-border)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                      <label className="admin-label">صورة الواجهة - وسط (Middle)</label>
                      {cmsSettings.heroImgMiddle && <img src={cmsSettings.heroImgMiddle} alt="Hero Middle" style={{ width: '100%', height: '150px', objectFit: 'cover', margin: '1rem auto' }} />}
                      <input type="file" accept="image/*" onChange={(e) => handleCmsImageUpload(e, 'heroImgMiddle')} style={{ fontSize: '0.8rem' }} />
                    </div>

                    {/* Hero Img Right */}
                    <div style={{ border: '1px solid var(--glass-border)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                      <label className="admin-label">صورة الواجهة - يسار (Right)</label>
                      {cmsSettings.heroImgRight && <img src={cmsSettings.heroImgRight} alt="Hero Right" style={{ width: '100%', height: '150px', objectFit: 'cover', margin: '1rem auto' }} />}
                      <input type="file" accept="image/*" onChange={(e) => handleCmsImageUpload(e, 'heroImgRight')} style={{ fontSize: '0.8rem' }} />
                    </div>

                  </div>

                  {/* ─── SHIPPING SETTINGS ─── */}
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                    <h4 style={{ color: 'var(--accent-color)', marginBottom: '1rem', fontSize: '1.1rem' }}>
                      <i className="fa-solid fa-truck-fast"></i> إعدادات الشحن (Shipping Settings)
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                      <div>
                        <label className="admin-label">حد الشحن المجاني (Free Shipping Min. ₪)</label>
                        <input type="number" min="0" value={cmsSettings.freeShippingThreshold || 250} onChange={e => setCmsSettings({...cmsSettings, freeShippingThreshold: Number(e.target.value)})} className="admin-input" />
                      </div>
                      <div>
                        <label className="admin-label">تكلفة الشحن (Shipping Cost ₪)</label>
                        <input type="number" min="0" value={cmsSettings.shippingCost || 30} onChange={e => setCmsSettings({...cmsSettings, shippingCost: Number(e.target.value)})} className="admin-input" />
                      </div>
                    </div>
                  </div>

                  {/* ─── SOCIAL MEDIA LINKS ─── */}
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                    <h4 style={{ color: 'var(--accent-color)', marginBottom: '1rem', fontSize: '1.1rem' }}>
                      <i className="fa-solid fa-share-nodes"></i> روابط وسائل التواصل الاجتماعي
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                      {[
                        { key: 'instagram', label: 'Instagram', icon: 'fa-brands fa-instagram', placeholder: 'https://instagram.com/...' },
                        { key: 'facebook', label: 'Facebook', icon: 'fa-brands fa-facebook-f', placeholder: 'https://facebook.com/...' },
                        { key: 'tiktok', label: 'TikTok', icon: 'fa-brands fa-tiktok', placeholder: 'https://tiktok.com/@...' },
                        { key: 'whatsapp', label: 'WhatsApp', icon: 'fa-brands fa-whatsapp', placeholder: 'https://wa.me/972...' },
                        { key: 'snapchat', label: 'Snapchat', icon: 'fa-brands fa-snapchat', placeholder: 'https://snapchat.com/add/...' },
                        { key: 'youtube', label: 'YouTube', icon: 'fa-brands fa-youtube', placeholder: 'https://youtube.com/@...' },
                        { key: 'twitter', label: 'X (Twitter)', icon: 'fa-brands fa-x-twitter', placeholder: 'https://x.com/...' },
                        { key: 'telegram', label: 'Telegram', icon: 'fa-brands fa-telegram', placeholder: 'https://t.me/...' },
                      ].map(s => (
                        <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <i className={s.icon} style={{ fontSize: '1.3rem', color: 'var(--text-secondary)', width: '22px', textAlign: 'center' }}></i>
                          <input
                            type="url"
                            placeholder={s.placeholder}
                            value={cmsSettings.socials?.[s.key] || ''}
                            onChange={e => setCmsSettings({...cmsSettings, socials: {...(cmsSettings.socials || {}), [s.key]: e.target.value}})}
                            className="admin-input"
                            style={{ flex: 1 }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ─── ADS BANNERS ─── */}
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h4 style={{ color: 'var(--accent-color)', margin: 0, fontSize: '1.1rem' }}>
                        <i className="fa-solid fa-rectangle-ad"></i> لافتات الإعلانات الترويجية (Ads Banners)
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          const current = cmsSettings.ads || [];
                          const newAd = { id: Date.now(), title: '', subtitle: '', badge: '', linkUrl: '', linkText: '', imageUrl: '', active: true };
                          setCmsSettings({...cmsSettings, ads: [...current, newAd]});
                        }}
                        style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--accent-color)', background: 'none', color: 'var(--accent-color)', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' }}
                      >
                        <i className="fa-solid fa-plus"></i> إضافة إعلان
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      {(cmsSettings.ads || []).map((ad, idx) => (
                        <div key={ad.id || idx} style={{ border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '1.5rem', position: 'relative', background: 'var(--bg-color)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <strong style={{ color: 'var(--text-primary)' }}>إعلان #{idx + 1}</strong>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                                <input type="checkbox" checked={ad.active} onChange={e => {
                                  const ads = [...(cmsSettings.ads || [])];
                                  ads[idx] = {...ad, active: e.target.checked};
                                  setCmsSettings({...cmsSettings, ads});
                                }} />
                                مُفعّل
                              </label>
                              <button type="button" onClick={() => {
                                const ads = (cmsSettings.ads || []).filter((_, i) => i !== idx);
                                setCmsSettings({...cmsSettings, ads});
                              }} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #e74c3c', background: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '0.85rem' }}>
                                <i className="fa-solid fa-trash"></i>
                              </button>
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                            {/* Multilingual Title */}
                            <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', background: 'var(--surface-color)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                              <div>
                                <label className="admin-label">العنوان (عربي)</label>
                                <input value={ad.title_ar || ad.title || ''} onChange={e => { const ads=[...(cmsSettings.ads||[])]; ads[idx]={...ad,title_ar:e.target.value,title:e.target.value}; setCmsSettings({...cmsSettings,ads}); }} className="admin-input" placeholder="عرض خاص!" />
                              </div>
                              <div>
                                <label className="admin-label">Title (English)</label>
                                <input value={ad.title_en || ''} onChange={e => { const ads=[...(cmsSettings.ads||[])]; ads[idx]={...ad,title_en:e.target.value}; setCmsSettings({...cmsSettings,ads}); }} className="admin-input" placeholder="Special Offer!" />
                              </div>
                              <div>
                                <label className="admin-label">כותרת (עברית)</label>
                                <input value={ad.title_he || ''} onChange={e => { const ads=[...(cmsSettings.ads||[])]; ads[idx]={...ad,title_he:e.target.value}; setCmsSettings({...cmsSettings,ads}); }} className="admin-input" placeholder="מבצע מיוחד!" />
                              </div>
                            </div>

                            {/* Multilingual Subtitle */}
                            <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', background: 'var(--surface-color)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                              <div>
                                <label className="admin-label">الوصف (عربي)</label>
                                <input value={ad.subtitle_ar || ad.subtitle || ''} onChange={e => { const ads=[...(cmsSettings.ads||[])]; ads[idx]={...ad,subtitle_ar:e.target.value,subtitle:e.target.value}; setCmsSettings({...cmsSettings,ads}); }} className="admin-input" placeholder="تسوقي الآن" />
                              </div>
                              <div>
                                <label className="admin-label">Subtitle (English)</label>
                                <input value={ad.subtitle_en || ''} onChange={e => { const ads=[...(cmsSettings.ads||[])]; ads[idx]={...ad,subtitle_en:e.target.value}; setCmsSettings({...cmsSettings,ads}); }} className="admin-input" placeholder="Shop now" />
                              </div>
                              <div>
                                <label className="admin-label">כתובית (עברית)</label>
                                <input value={ad.subtitle_he || ''} onChange={e => { const ads=[...(cmsSettings.ads||[])]; ads[idx]={...ad,subtitle_he:e.target.value}; setCmsSettings({...cmsSettings,ads}); }} className="admin-input" placeholder="קנו עכשיו" />
                              </div>
                            </div>

                            {/* Multilingual Badge */}
                            <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', background: 'var(--surface-color)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                              <div>
                                <label className="admin-label">شارة - Badge (عربي)</label>
                                <input value={ad.badge_ar || ad.badge || ''} onChange={e => { const ads=[...(cmsSettings.ads||[])]; ads[idx]={...ad,badge_ar:e.target.value,badge:e.target.value}; setCmsSettings({...cmsSettings,ads}); }} className="admin-input" placeholder="خصم 50%" />
                              </div>
                              <div>
                                <label className="admin-label">Badge (English)</label>
                                <input value={ad.badge_en || ''} onChange={e => { const ads=[...(cmsSettings.ads||[])]; ads[idx]={...ad,badge_en:e.target.value}; setCmsSettings({...cmsSettings,ads}); }} className="admin-input" placeholder="50% OFF" />
                              </div>
                              <div>
                                <label className="admin-label">תג (עברית)</label>
                                <input value={ad.badge_he || ''} onChange={e => { const ads=[...(cmsSettings.ads||[])]; ads[idx]={...ad,badge_he:e.target.value}; setCmsSettings({...cmsSettings,ads}); }} className="admin-input" placeholder="50% הנחה" />
                              </div>
                            </div>

                            {/* Multilingual Link Text */}
                            <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', background: 'var(--surface-color)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                              <div>
                                <label className="admin-label">نص الزر (عربي)</label>
                                <input value={ad.linkText_ar || ad.linkText || ''} onChange={e => { const ads=[...(cmsSettings.ads||[])]; ads[idx]={...ad,linkText_ar:e.target.value,linkText:e.target.value}; setCmsSettings({...cmsSettings,ads}); }} className="admin-input" placeholder="تسوق" />
                              </div>
                              <div>
                                <label className="admin-label">Button Text (English)</label>
                                <input value={ad.linkText_en || ''} onChange={e => { const ads=[...(cmsSettings.ads||[])]; ads[idx]={...ad,linkText_en:e.target.value}; setCmsSettings({...cmsSettings,ads}); }} className="admin-input" placeholder="Shop" />
                              </div>
                              <div>
                                <label className="admin-label">טקסט כפתור (עברית)</label>
                                <input value={ad.linkText_he || ''} onChange={e => { const ads=[...(cmsSettings.ads||[])]; ads[idx]={...ad,linkText_he:e.target.value}; setCmsSettings({...cmsSettings,ads}); }} className="admin-input" placeholder="קנה" />
                              </div>
                            </div>

                            <div style={{ gridColumn: '1 / -1' }}>
                              <label className="admin-label">رابط الزر العام (Button URL)</label>
                              <input value={ad.linkUrl || ''} onChange={e => { const ads=[...(cmsSettings.ads||[])]; ads[idx]={...ad,linkUrl:e.target.value}; setCmsSettings({...cmsSettings,ads}); }} className="admin-input" placeholder="/#shop" />
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                              <label className="admin-label">صورة الإعلان (Banner Image)</label>
                              {ad.imageUrl && <img src={ad.imageUrl} alt="" style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px' }} />}
                              <input type="file" accept="image/*" onChange={async (e) => {
                                const file = e.target.files[0]; if (!file) return;
                                const compressed = await compressImage(file);
                                const ads=[...(cmsSettings.ads||[])]; ads[idx]={...ad,imageUrl:compressed}; setCmsSettings({...cmsSettings,ads});
                              }} style={{ fontSize: '0.85rem' }} />
                            </div>
                          </div>
                        </div>
                      ))}
                      {(cmsSettings.ads || []).length === 0 && (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', border: '2px dashed var(--border-color)', borderRadius: '12px' }}>
                          لا توجد إعلانات. اضغط "إضافة إعلان" لإنشاء لافتة ترويجية.
                        </div>
                      )}
                    </div>
                  </div>

                  <button type="submit" disabled={isSavingCms} style={{ padding: '1rem', background: 'var(--accent-color)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1.2rem', cursor: 'pointer', marginTop: '1rem' }}>
                    {isSavingCms ? 'جاري الحفظ...' : 'حفظ جميع الإعدادات'}
                  </button>
                </form>
              </div>
            )}





            {/* PROMO CODES TAB */}
            {activeTab === 'promos' && (
              <div className="admin-card">
                <h2>كوبونات الخصم (Promo Codes)</h2>
                <div style={{ background: 'var(--surface-color)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--glass-border)', marginBottom: '2rem' }}>
                  <h3>إضافة كود جديد</h3>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input type="text" placeholder="الكود (مثال: SUMMER20)" value={newPromo.code} onChange={(e) => setNewPromo({...newPromo, code: e.target.value.toUpperCase()})} style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', flex: 1 }} />
                    <select value={newPromo.type} onChange={(e) => setNewPromo({...newPromo, type: e.target.value})} style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <option value="fixed">مبلغ ثابت (شيكل)</option>
                      <option value="percent">نسبة مئوية (%)</option>
                    </select>
                    <input type="number" placeholder="القيمة" value={newPromo.discountValue || ''} onChange={(e) => setNewPromo({...newPromo, discountValue: Number(e.target.value)})} style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', width: '120px' }} />
                    <button onClick={async () => {
                      if (!newPromo.code || newPromo.discountValue <= 0) return showToast('الرجاء إدخال بيانات صحيحة', 'error');
                      try {
                        const id = await addPromoCode(newPromo);
                        setPromoCodes([...promoCodes, { ...newPromo, id }]);
                        setNewPromo({ code: '', discountValue: 0, type: 'fixed' });
                        showToast('تم إضافة الكود بنجاح', 'success');
                      } catch(e) {
                        showToast('خطأ في الإضافة', 'error');
                      }
                    }} className="btn-primary" style={{ padding: '0.8rem 1.5rem' }}>إضافة</button>
                  </div>
                </div>

                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>الكود</th>
                        <th>النوع</th>
                        <th>القيمة</th>
                        <th>إجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {promoCodes.map((promo) => (
                        <tr key={promo.id}>
                          <td style={{ fontWeight: 'bold' }}>{promo.code}</td>
                          <td>{promo.type === 'fixed' ? 'مبلغ ثابت' : 'نسبة مئوية'}</td>
                          <td>{promo.discountValue}{promo.type === 'percent' ? '%' : ' شيكل'}</td>
                          <td>
                            <button onClick={async () => {
                              if(confirm('هل أنت متأكد من الحذف؟')) {
                                await deletePromoCode(promo.id);
                                setPromoCodes(promoCodes.filter(p => p.id !== promo.id));
                                showToast('تم الحذف', 'success');
                              }
                            }} style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>حذف</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUPPORT TICKETS TAB */}
            {activeTab === 'tickets' && role === 'operator' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ color: 'var(--text-primary)', margin: 0 }}>
                    <i className="fa-solid fa-headset"></i> تذاكر دعم العملاء
                  </h3>
                  <span style={{ background: 'var(--accent-color)', color: '#fff', borderRadius: '99px', padding: '4px 12px', fontSize: '0.8rem', fontWeight: 700 }}>
                    {tickets.filter(t => t.status === 'open').length} مفتوح
                  </span>
                </div>

                {tickets.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)', background: 'var(--surface-color)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                    <i className="fa-solid fa-ticket" style={{ fontSize: '3rem', opacity: 0.3, display: 'block', marginBottom: '1rem' }}></i>
                    لا توجد تذاكر دعم بعد
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {tickets.map(ticket => (
                      <div key={ticket.id} style={{
                        background: 'var(--surface-color)', borderRadius: '14px', padding: '1.5rem',
                        border: `1px solid ${ticket.status === 'open' ? 'var(--accent-color)55' : ticket.status === 'in_progress' ? '#f59e0b55' : 'var(--glass-border)'}`,
                        cursor: 'pointer',
                        boxShadow: selectedTicket?.id === ticket.id ? '0 0 0 2px var(--accent-color)' : 'none'
                      }}
                        onClick={() => setSelectedTicket(selectedTicket?.id === ticket.id ? null : ticket)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                          <div>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '6px' }}>
                              <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--accent-color)', fontSize: '1rem' }}>{ticket.token}</span>
                              <span style={{
                                padding: '3px 10px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 700,
                                background: ticket.status === 'open' ? '#fef2f2' : ticket.status === 'in_progress' ? '#fffbeb' : '#f0fdf4',
                                color: ticket.status === 'open' ? '#dc2626' : ticket.status === 'in_progress' ? '#d97706' : '#16a34a',
                                border: `1px solid ${ticket.status === 'open' ? '#fca5a5' : ticket.status === 'in_progress' ? '#fcd34d' : '#86efac'}`
                              }}>
                                {ticket.status === 'open' ? '🔴 مفتوح' : ticket.status === 'in_progress' ? '🟡 جاري' : '✅ مُحلول'}
                              </span>
                            </div>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>{ticket.name}</div>
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                              {ticket.phone && <span><i className="fa-solid fa-phone"></i> {ticket.phone} · </span>}
                              {ticket.email && <span><i className="fa-solid fa-envelope"></i> {ticket.email} · </span>}
                              {ticket.orderNumber && <span>طلب #{ticket.orderNumber} · </span>}
                              {ticket.subject}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                              {new Date(ticket.createdAt).toLocaleString('ar-SA')}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <select
                              value={ticket.status}
                              onClick={e => e.stopPropagation()}
                              onChange={async (e) => {
                                await updateTicket(ticket.id, { status: e.target.value });
                                setTickets(prev => prev.map(t => t.id === ticket.id ? {...t, status: e.target.value} : t));
                                showToast('تم تحديث الحالة', 'success');
                              }}
                              style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '0.85rem', cursor: 'pointer' }}
                            >
                              <option value="open">مفتوح</option>
                              <option value="in_progress">جاري المعالجة</option>
                              <option value="resolved">مُحلول</option>
                            </select>
                            <button
                              onClick={async (e) => { e.stopPropagation(); if(confirm('حذف هذه التذكرة؟')) { await deleteTicket(ticket.id); setTickets(prev => prev.filter(t => t.id !== ticket.id)); showToast('تم الحذف', 'success'); } }}
                              style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #e74c3c', background: 'none', color: '#e74c3c', cursor: 'pointer' }}
                            >
                              <i className="fa-solid fa-trash"></i>
                            </button>
                          </div>
                        </div>

                        {/* Expanded detail view */}
                        {selectedTicket?.id === ticket.id && (
                          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)' }}>
                            <div style={{ background: 'var(--bg-color)', borderRadius: '10px', padding: '1rem', marginBottom: '1rem', color: 'var(--text-primary)', lineHeight: 1.7 }}>
                              <strong>الرسالة:</strong><br/>{ticket.message}
                            </div>
                            {ticket.images && ticket.images.length > 0 && (
                              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '1rem' }}>
                                {ticket.images.map((img, i) => (
                                  <img key={i} src={img} alt="" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '10px', border: '1px solid var(--border-color)', cursor: 'pointer' }}
                                    onClick={() => window.open(img, '_blank')}
                                  />
                                ))}
                              </div>
                            )}
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <textarea
                                placeholder="ملاحظة داخلية للموظفين..."
                                defaultValue={ticket.adminNote || ''}
                                rows={2}
                                style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontFamily: 'inherit', resize: 'vertical' }}
                                onChange={e => {
                                  const val = e.target.value;
                                  setSelectedTicket(t => ({...t, adminNote: val}));
                                }}
                              />
                              <button
                                onClick={async () => {
                                  await updateTicket(ticket.id, { adminNote: selectedTicket.adminNote || '' });
                                  showToast('تم حفظ الملاحظة', 'success');
                                }}
                                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: 'var(--accent-color)', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                              >
                                حفظ
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* REVIEWS TAB */}
            {activeTab === 'reviews' && role === 'operator' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ color: 'var(--text-primary)', margin: 0 }}>
                    <i className="fa-solid fa-star"></i> إدارة التقييمات
                  </h3>
                  <span style={{ background: 'var(--accent-color)', color: '#fff', borderRadius: '99px', padding: '4px 12px', fontSize: '0.8rem', fontWeight: 700 }}>
                    {adminReviews.filter(r => !r.isHidden).length} نشط
                  </span>
                </div>

                {adminReviews.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)', background: 'var(--surface-color)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                    <i className="fa-solid fa-star-half-stroke" style={{ fontSize: '3rem', opacity: 0.3, display: 'block', marginBottom: '1rem' }}></i>
                    لا توجد تقييمات بعد
                  </div>
                ) : (
                  <div style={{ background: 'var(--surface-color)', borderRadius: '16px', border: '1px solid var(--glass-border)', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'right', color: 'var(--text-secondary)' }}>
                          <th style={{ padding: '1rem' }}>المنتج</th>
                          <th style={{ padding: '1rem' }}>المستخدم</th>
                          <th style={{ padding: '1rem' }}>التقييم</th>
                          <th style={{ padding: '1rem' }}>التعليق</th>
                          <th style={{ padding: '1rem' }}>الحالة</th>
                          <th style={{ padding: '1rem' }}>إجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminReviews.map(review => {
                          const prod = products.find(p => p.id === review.productId);
                          return (
                            <tr key={review.id} style={{ borderBottom: '1px solid var(--glass-border)', opacity: review.isHidden ? 0.6 : 1 }}>
                              <td style={{ padding: '1rem', fontWeight: 'bold' }}>{prod ? prod.title : review.productId}</td>
                              <td style={{ padding: '1rem' }}>{review.userName}</td>
                              <td style={{ padding: '1rem', color: '#f1c40f' }}>
                                {[...Array(5)].map((_, i) => (
                                  <i key={i} className={`fa-solid fa-star`} style={{ color: i < review.rating ? '#f1c40f' : '#e0e0e0', fontSize: '0.9rem' }}></i>
                                ))}
                              </td>
                              <td style={{ padding: '1rem', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={review.comment}>
                                {review.comment}
                              </td>
                              <td style={{ padding: '1rem' }}>
                                <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', background: review.isHidden ? '#fdecea' : '#eafaf1', color: review.isHidden ? '#e74c3c' : '#27ae60' }}>
                                  {review.isHidden ? 'مخفي' : 'ظاهر'}
                                </span>
                              </td>
                              <td style={{ padding: '1rem', display: 'flex', gap: '8px' }}>
                                <button
                                  onClick={async () => {
                                    const newHidden = !review.isHidden;
                                    await updateReview(review.id, { isHidden: newHidden });
                                    setAdminReviews(prev => prev.map(r => r.id === review.id ? { ...r, isHidden: newHidden } : r));
                                    showToast(newHidden ? 'تم إخفاء التقييم' : 'تم إظهار التقييم', 'success');
                                  }}
                                  className="btn-details" style={{ flex: 1 }}
                                >
                                  {review.isHidden ? <i className="fa-solid fa-eye"></i> : <i className="fa-solid fa-eye-slash"></i>}
                                </button>
                                <button
                                  onClick={async () => {
                                    if(confirm('هل أنت متأكد من حذف هذا التقييم؟')) {
                                      await deleteReview(review.id);
                                      setAdminReviews(prev => prev.filter(r => r.id !== review.id));
                                      showToast('تم حذف التقييم', 'success');
                                    }
                                  }}
                                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #e74c3c', background: 'transparent', color: '#e74c3c', cursor: 'pointer' }}
                                >
                                  <i className="fa-solid fa-trash"></i>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* CUSTOMERS DATABASE TAB */}
            {activeTab === 'customers' && role === 'operator' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div style={{ background: 'var(--surface-color)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-sm)' }}>
                  
                  {/* Search and Sort Toolbar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
                    <div style={{ flex: '1 1 300px', position: 'relative' }}>
                      <input 
                        type="text" 
                        placeholder="ابحث عن عميل بالاسم، الهاتف، المدينة أو البريد الإلكتروني..." 
                        value={searchCustomerQuery}
                        onChange={(e) => setSearchCustomerQuery(e.target.value)}
                        className="admin-input"
                        style={{ paddingRight: '2.5rem' }}
                      />
                      <i className="fa-solid fa-search" style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}></i>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}><i className="fa-solid fa-sort"></i> ترتيب حسب:</span>
                      <select 
                        value={customerSortField} 
                        onChange={(e) => setCustomerSortField(e.target.value)}
                        style={{ padding: '0.8rem 1.25rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontWeight: '600', cursor: 'pointer' }}
                      >
                        <option value="clv">الأكثر إنفاقاً (CLV)</option>
                        <option value="ordersCount">الأكثر طلباً (العدد)</option>
                        <option value="recent">الطلبات الحديثة</option>
                      </select>
                    </div>
                  </div>

                  {/* Customer Directory Table */}
                  <div className="admin-table-container" style={{ borderRadius: '12px', border: '1px solid var(--glass-border)', overflow: 'hidden' }}>
                    <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'rgba(44, 43, 41, 0.05)', textAlign: 'right' }}>
                          <th style={{ padding: '1.25rem 1rem' }}>الاسم الكامل</th>
                          <th style={{ padding: '1.25rem 1rem' }}>رقم الهاتف</th>
                          <th style={{ padding: '1.25rem 1rem' }}>المدينة والمنطقة</th>
                          <th style={{ padding: '1.25rem 1rem', textAlign: 'center' }}>الطلبات</th>
                          <th style={{ padding: '1.25rem 1rem', textAlign: 'center' }}>إجمالي الإنفاق (CLV)</th>
                          <th style={{ padding: '1.25rem 1rem' }}>آخر شراء</th>
                          <th style={{ padding: '1.25rem 1rem', textAlign: 'center' }}>إجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customerProfiles.map((profile, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.2s' }}>
                            <td style={{ padding: '1.25rem 1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ background: 'var(--accent-color)', color: 'var(--bg-color)', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                  {profile.fullName.slice(0, 1)}
                                </div>
                                <div>
                                  <strong style={{ display: 'block', color: 'var(--text-primary)' }}>{profile.fullName}</strong>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{profile.email}</span>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '1.25rem 1rem', fontWeight: '600' }} dir="ltr">{profile.phone}</td>
                            <td style={{ padding: '1.25rem 1rem' }}>{profile.city}</td>
                            <td style={{ padding: '1.25rem 1rem', textAlign: 'center', fontWeight: '700' }}>
                              <span style={{ background: 'rgba(52, 152, 219, 0.1)', color: '#3498db', padding: '4px 10px', borderRadius: '9999px', fontSize: '0.8rem' }}>
                                {profile.ordersCount} طلبات
                              </span>
                            </td>
                            <td style={{ padding: '1.25rem 1rem', textAlign: 'center', color: 'var(--accent-color)', fontWeight: 'bold', fontSize: '1.05rem' }}>
                              ₪{profile.totalSpent.toFixed(2)}
                            </td>
                            <td style={{ padding: '1.25rem 1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                              {new Date(profile.lastPurchaseDate).toLocaleDateString('en-GB')} {new Date(profile.lastPurchaseDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td style={{ padding: '1.25rem 1rem', textAlign: 'center' }}>
                              <button 
                                onClick={() => setSelectedCustomer(profile)}
                                className="btn-primary" 
                                style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', borderRadius: '6px' }}
                              >
                                عرض المشتريات
                              </button>
                            </td>
                          </tr>
                        ))}

                        {customerProfiles.length === 0 && (
                          <tr>
                            <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                              لا توجد بيانات مطابقة لعمليات البحث الخاصة بك.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* MAP TAB */}
            {activeTab === 'map' && role === 'operator' && (
              <AdminMap orders={orders} />
            )}

          </div>
        )}
      </main>

      {/* FULL SCREEN ORDER DETAILS MODAL */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>تفاصيل الطلب: {selectedOrder.id}</h2>
              </div>
              <button className="close-modal" onClick={() => setSelectedOrder(null)}><i className="fa-solid fa-times"></i></button>
            </div>
            
            <div className="modal-body">
              <div className="modal-section">
                <h3><i className="fa-solid fa-user"></i> بيانات العميل والشحن</h3>
                <div className="details-grid">
                  <div className="detail-item"><span>الاسم</span><strong>{selectedOrder.shipping?.fullName || selectedOrder.customerInfo?.fullName}</strong></div>
                  <div className="detail-item"><span>رقم الهاتف</span><strong dir="ltr">{selectedOrder.shipping?.phone1 || selectedOrder.shipping?.phone || selectedOrder.customerInfo?.phone1 || selectedOrder.customerInfo?.phone}</strong></div>
                  <div className="detail-item"><span>المدينة</span><strong>{selectedOrder.shipping?.city || selectedOrder.customerInfo?.city}</strong></div>
                  <div className="detail-item"><span>العنوان</span><strong>{(selectedOrder.shipping?.neighborhood || selectedOrder.customerInfo?.neighborhood)} - {(selectedOrder.shipping?.street || selectedOrder.customerInfo?.street)}</strong></div>
                  <div className="detail-item"><span>البريد الإلكتروني</span><strong>{selectedOrder.customerInfo?.email || selectedOrder.shipping?.email || '—'}</strong></div>
                  <div className="detail-item"><span>هاتف بديل</span><strong dir="ltr">{selectedOrder.shipping?.phone2 || selectedOrder.customerInfo?.phone2 || '—'}</strong></div>
                  <div className="detail-item"><span>طريقة الدفع</span><strong>{selectedOrder.paymentMethod === 'cash' ? '💵 الدفع عند الاستلام' : selectedOrder.paymentMethod === 'paypal' ? '🔵 PayPal' : '💳 بطاقة ائتمان'}</strong></div>
                  <div className="detail-item"><span>حالة الطلب</span><strong>{selectedOrder.status}</strong></div>
                  <div className="detail-item"><span>تاريخ الطلب</span><strong>{selectedOrder.date ? new Date(selectedOrder.date).toLocaleString('ar-EG') : '—'}</strong></div>
                  {selectedOrder.promoCode && <div className="detail-item"><span>كود الخصم</span><strong>{selectedOrder.promoCode}</strong></div>}
                  {selectedOrder.discount > 0 && <div className="detail-item"><span>قيمة الخصم</span><strong style={{color: '#e74c3c'}}>-₪{selectedOrder.discount?.toFixed(2)}</strong></div>}
                </div>
              </div>

              <div className="modal-section">
                <h3><i className="fa-solid fa-box"></i> المنتجات المطلوبة</h3>
                <div className="items-list">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="order-item">
                      <img src={item.images?.[0] || item.image} alt={item.title} />
                      <div className="item-info">
                        <h4>{item.title}</h4>
                        <span className="item-qty">الكمية: {item.quantity} {item.sku && `| SKU: ${item.sku}`}</span>
                      </div>
                      <div className="item-price">₪{(item.price * item.quantity).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
                <div className="order-total-box">
                  <span>الإجمالي:</span>
                  <span className="total-amount">₪{selectedOrder.total?.toFixed(2)}</span>
                </div>
              </div>

              <div className="modal-section" style={{ marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <h3 style={{ color: 'var(--text-primary)' }}><i className="fa-solid fa-truck-fast"></i> التتبع والإدارة (Full Control)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <input 
                      type="text" 
                      placeholder="أدخل رقم التتبع (Tracking ID)" 
                      defaultValue={selectedOrder.trackingId || ''}
                      id="trackingInputModal"
                      style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', flex: 1, minWidth: '200px' }}
                    />
                    <button 
                      onClick={() => handleUpdateTracking(selectedOrder.id, document.getElementById('trackingInputModal').value)}
                      style={{ padding: '0 1.5rem', background: 'var(--accent-color)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      حفظ التتبع
                    </button>
                  </div>
                  <button 
                    onClick={() => handleDeleteOrder(selectedOrder.id)}
                    style={{ padding: '1rem', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '1rem' }}
                  >
                    <i className="fa-solid fa-trash-can"></i> حذف هذا الطلب نهائياً
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* FULL SCREEN CUSTOMER PURCHASE HISTORY MODAL */}
      {selectedCustomer && (
        <div className="modal-overlay" onClick={() => setSelectedCustomer(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '850px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'var(--accent-color)', color: 'var(--bg-color)', width: '45px', height: '45px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>
                  {selectedCustomer.fullName.slice(0, 1)}
                </div>
                <div>
                  <h2 style={{ fontSize: '1.4rem', margin: 0 }}>سجل مشتريات العميل: {selectedCustomer.fullName}</h2>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>تاريخ الشراء الأخير: {new Date(selectedCustomer.lastPurchaseDate).toLocaleDateString('en-GB')}</span>
                </div>
              </div>
              <button className="close-modal" onClick={() => setSelectedCustomer(null)}><i className="fa-solid fa-times"></i></button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Customer Profile Quick Card */}
              <div style={{ background: 'rgba(44, 43, 41, 0.03)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                <h3 style={{ fontSize: '1.05rem', marginBottom: '1rem', color: 'var(--text-primary)' }}><i className="fa-solid fa-address-card"></i> بيانات العميل الشخصية</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', fontSize: '0.95rem' }}>
                  <div><span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem' }}>رقم الهاتف:</span><strong>{selectedCustomer.phone}</strong></div>
                  <div><span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem' }}>البريد الإلكتروني:</span><strong>{selectedCustomer.email}</strong></div>
                  <div><span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem' }}>المدينة:</span><strong>{selectedCustomer.city}</strong></div>
                  <div><span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem' }}>العنوان المفصل:</span><strong>{selectedCustomer.address}</strong></div>
                  <div><span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem' }}>إجمالي الطلبات:</span><strong>{selectedCustomer.ordersCount} طلبات</strong></div>
                  <div><span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem' }}>قيمة العميل الدائمة (CLV):</span><strong style={{ color: 'var(--accent-color)', fontSize: '1.1rem' }}>₪{selectedCustomer.totalSpent.toFixed(2)}</strong></div>
                </div>
              </div>

              {/* Order History Timeline */}
              <div>
                <h3 style={{ fontSize: '1.15rem', marginBottom: '1.25rem', color: 'var(--text-primary)' }}><i className="fa-solid fa-history"></i> تاريخ الطلبات السابقة</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {selectedCustomer.ordersList.map((order, idx) => (
                    <div key={idx} style={{ background: 'rgba(220, 214, 202, 0.25)', border: '1px solid var(--glass-border)', padding: '1.5rem', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          <span style={{ fontWeight: '700', color: 'var(--text-primary)', display: 'block' }}>طلب #{order.id}</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {new Date(order.date || order.createdAt).toLocaleDateString('en-GB')} | {new Date(order.date || order.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>الحالة:</span>
                          <select 
                            value={order.status} 
                            onChange={(e) => updateOrderStatus(order.id, e.target.value)} 
                            style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid var(--glass-border)', fontSize: '0.8rem', fontWeight: 'bold', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                          >
                            <option value="قيد المعالجة (مدفوع)">قيد المعالجة (مدفوع)</option>
                            <option value="جاري التوصيل">جاري التوصيل</option>
                            <option value="تم التوصيل">تم التوصيل</option>
                            <option value="ملغي">ملغي</option>
                          </select>
                        </div>
                      </div>

                      {/* Items inside this order */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        {order.items?.map((item, itemIdx) => (
                          <div key={itemIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <img src={item.images?.[0] || item.image || '/assets/black_jilbab_1779926556174.png'} alt={item.title} style={{ width: '40px', height: '52px', objectFit: 'cover', borderRadius: '6px', boxShadow: 'var(--shadow-sm)' }} />
                              <div>
                                <span style={{ fontWeight: '600' }}>{item.title}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>المقاس: {item.selectedSize || item.size || 'One Size'} × {item.quantity}</span>
                              </div>
                            </div>
                            <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>₪{((item.price || 0) * (item.quantity || 1)).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.8rem', fontSize: '0.95rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>إجمالي الفاتورة:</span>
                        <strong style={{ color: 'var(--accent-color)', fontSize: '1.15rem' }}>₪{order.total?.toFixed(2)}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helpers
const navButtonStyle = (isActive) => ({
  textAlign: 'right', 
  padding: '1rem', 
  background: isActive ? 'var(--accent-color)' : 'transparent', 
  color: isActive ? '#000' : 'var(--text-primary)', 
  borderRadius: '8px', 
  fontWeight: 'bold', 
  transition: '0.3s',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  cursor: 'pointer',
  border: 'none',
  width: '100%'
});

const EmptyState = ({ icon, text }) => (
  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
    <i className={`fa-solid ${icon}`} style={{ fontSize: '5rem', marginBottom: '1.5rem', opacity: 0.3 }}></i>
    <p style={{ fontSize: '1.2rem' }}>{text}</p>
  </div>
);
