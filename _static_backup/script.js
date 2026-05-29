// بيانات المنتجات
const products = [
    {
        id: 1,
        title: "جلباب أسود مميز",
        price: 89.99,
        image: "assets/black_jilbab_1779926556174.png",
        description: "قماش فاخر منسدل، أنيق وعصري."
    },
    {
        id: 2,
        title: "جلباب بيج فاتح",
        price: 94.99,
        image: "assets/beige_jilbab_1779926569451.png",
        description: "ألوان ناعمة، مثالية لأناقة كل يوم."
    },
    {
        id: 3,
        title: "جلباب كحلي غامق",
        price: 89.99,
        image: "assets/black_jilbab_1779926556174.png", // Reusing image for demo
        description: "لون كحلي عميق، راقٍ وأنيق."
    }
];

// حالة المتجر
let cart = [];

// عناصر DOM
const productGrid = document.getElementById('product-grid');
const cartToggleBtn = document.getElementById('cart-toggle-btn');
const closeCartBtn = document.getElementById('close-cart-btn');
const cartSidebar = document.getElementById('cart-sidebar');
const cartOverlay = document.getElementById('cart-overlay');
const cartItemsContainer = document.getElementById('cart-items-container');
const cartCount = document.getElementById('cart-count');
const cartTotalPrice = document.getElementById('cart-total-price');

// تهيئة المتجر
function initStore() {
    renderProducts();
    setupEventListeners();
    updateCartUI();
}

// عرض المنتجات
function renderProducts() {
    productGrid.innerHTML = '';
    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.classList.add('product-card');
        
        productCard.innerHTML = `
            <div class="product-image">
                <img src="${product.image}" alt="${product.title}" loading="lazy">
            </div>
            <div class="product-info">
                <h3 class="product-title">${product.title}</h3>
                <div class="product-price">$${product.price.toFixed(2)}</div>
                <button class="add-to-cart" onclick="addToCart(${product.id})">
                    أضف إلى السلة
                </button>
            </div>
        `;
        
        productGrid.appendChild(productCard);
    });
}

// إضافة منتج إلى السلة
window.addToCart = function(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    // التحقق من وجود المنتج مسبقاً
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    
    // تحريك أيقونة السلة
    cartToggleBtn.style.transform = 'scale(1.2)';
    setTimeout(() => {
        cartToggleBtn.style.transform = 'scale(1)';
    }, 200);
    
    updateCartUI();
    openCart();
}

// إزالة منتج من السلة
window.removeFromCart = function(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartUI();
}

// تحديث واجهة السلة (العدد، العناصر، الإجمالي)
function updateCartUI() {
    // تحديث العدد
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.innerText = totalItems;
    
    // تحديث قائمة العناصر
    cartItemsContainer.innerHTML = '';
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p style="color: var(--text-secondary); text-align: center; margin-top: 2rem;">عربة التسوق فارغة.</p>';
    } else {
        cart.forEach(item => {
            const cartItemEl = document.createElement('div');
            cartItemEl.classList.add('cart-item');
            
            cartItemEl.innerHTML = `
                <img src="${item.image}" alt="${item.title}">
                <div class="item-details">
                    <div class="item-title">${item.title}</div>
                    <div class="item-price">$${item.price.toFixed(2)} x ${item.quantity}</div>
                </div>
                <button class="remove-item" onclick="removeFromCart(${item.id})" aria-label="إزالة العنصر">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            `;
            
            cartItemsContainer.appendChild(cartItemEl);
        });
    }
    
    // تحديث السعر الإجمالي
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotalPrice.innerText = `$${totalPrice.toFixed(2)}`;
}

// إظهار/إخفاء الشريط الجانبي للسلة
function openCart() {
    cartSidebar.classList.add('active');
    cartOverlay.classList.add('active');
    document.body.style.overflow = 'hidden'; // منع التمرير في الخلفية
}

function closeCart() {
    cartSidebar.classList.remove('active');
    cartOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

// إعداد مستمعي الأحداث
function setupEventListeners() {
    cartToggleBtn.addEventListener('click', openCart);
    closeCartBtn.addEventListener('click', closeCart);
    cartOverlay.addEventListener('click', closeCart);
    
    // تأثير التمرير في شريط التنقل
    window.addEventListener('scroll', () => {
        const header = document.querySelector('header');
        if (window.scrollY > 50) {
            header.style.background = 'rgba(10, 10, 10, 0.9)';
            header.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.5)';
        } else {
            header.style.background = 'var(--glass-bg)';
            header.style.boxShadow = 'none';
        }
    });
}

// التهيئة عند التحميل
document.addEventListener('DOMContentLoaded', initStore);
