// assets/js/portal.js
// Abre automáticamente el accordion del curso según ?open=course.* en portal-alumno
(function(){
  try{
    var q = new URLSearchParams(location.search);
    var open = q.get('open');
    if(!open) return;
    var map = {
      'course.pmv':'[data-entitlement="course.pmv"]',
      'course.pmf':'[data-entitlement="course.pmf"]',
      'course.growth':'[data-entitlement="course.growth"]',
      'course.ceo':'[data-entitlement="course.ceo"]'
    };
    var sel = map[open]; if(!sel) return;
    var el = document.querySelector(sel);
    if(el && el.tagName.toLowerCase()==='details'){
      el.open = true;
      el.scrollIntoView({behavior:'smooth', block:'start'});
    }
  }catch(e){}
})();
