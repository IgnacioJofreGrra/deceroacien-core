// assets/js/forms.js
// Manejo genérico de formularios simples: oculta el contenedor del formulario
// y muestra un bloque de "gracias". Sin dependencias y reutilizable.
(function(){
  function onReady(fn){
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function initSimpleForms(){
    var forms = document.querySelectorAll('form[data-behavior="simple-toggle"]');
    forms.forEach(function(form){
      form.addEventListener('submit', function(ev){
        ev.preventDefault();
        try{
          var emailInput = form.querySelector('input[type="email"], input#email, input[name="email"]');
          var emailTarget = document.getElementById('user-email');
          if(emailInput && emailTarget){ emailTarget.textContent = emailInput.value || ''; }

          var formContainer = document.getElementById('form-container');
          var thankYou = document.getElementById('thank-you');
          if(formContainer && thankYou){
            formContainer.classList.add('hidden');
            thankYou.classList.remove('hidden');
          }
        }catch(e){ /* no-op */ }
      });
    });
  }

  onReady(initSimpleForms);
})();
