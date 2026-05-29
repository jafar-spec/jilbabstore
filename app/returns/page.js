import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'מדיניות החזרות וביטולים | متجر جلباب',
  description: 'מדיניות ההחזרות והביטולים של החנות בהתאם לחוק הגנת הצרכן.',
}

export default function ReturnsPolicy() {
  return (
    <main>
      
      <div style={{ paddingTop: '100px', minHeight: '60vh', maxWidth: '800px', margin: '0 auto', padding: '120px 20px 40px', lineHeight: '1.8' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem', textAlign: 'center', fontWeight: 'bold' }}>מדיניות החזרות וביטולים</h1>
        
        <div style={{ background: 'var(--surface-color)', padding: '2rem', borderRadius: '15px', border: '1px solid var(--glass-border)' }}>
          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>1. זכות ביטול והחזרה</h2>
            <p>בהתאם לחוק הגנת הצרכן (התשמ"א - 1981), לקוח רשאי לבטל עסקת רכישה ולהחזיר מוצר בתוך <strong>14 ימים</strong> מיום קבלת המוצר או מיום קבלת מסמך פרטי העסקה, המאוחר מביניהם.</p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>2. תנאים להחזרת מוצר</h2>
            <ul style={{ paddingRight: '20px' }}>
              <li>המוצר יוחזר כשהוא באריזתו המקורית, ללא פגם, ולא נעשה בו כל שימוש.</li>
              <li>יש לצרף את התווית (Tag) המקורית ללא שנותקה מהבגד.</li>
              <li>מוצר שיוצר בהתאמה אישית או עבר שינוי מיוחד אינו ניתן להחזרה.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>3. דמי ביטול</h2>
            <p>במקרה של ביטול עסקה (שלא עקב פגם במוצר או אי התאמה), ייגבו דמי ביטול בשיעור של <strong>5%</strong> מסכום העסקה או <strong>100 ש"ח</strong>, הנמוך מביניהם. דמי המשלוח הראשוניים אינם מוחזרים, ועלויות המשלוח חזרה חלות על הלקוח.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>4. אופן קבלת ההחזר</h2>
            <p>ההחזר הכספי יבוצע אל אותו אמצעי תשלום (כרטיס אשראי) שבו בוצעה הרכישה, תוך עד 14 ימי עסקים ממועד קבלת המוצר המוחזר במחסנינו ובדיקתו.</p>
          </section>
        </div>
      </div>
      
    </main>
  );
}
