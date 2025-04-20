// script.js

(function() {
    'use strict';
  
    /** Toggle du menu mobile */
    function initMenuToggle() {
      const btn = document.querySelector('.menu-toggle');
      const navList = document.querySelector('nav ul');
      if (!btn || !navList) return;
      btn.addEventListener('click', () => {
        navList.classList.toggle('open');
      });
    }
  
    /** Smooth scroll pour les ancres */
    function initSmoothScroll() {
      document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
          e.preventDefault();
          const target = document.querySelector(this.getAttribute('href'));
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      });
    }
  
    /** ScrollSpy : surligne l'item de nav actif */
    function initScrollSpy() {
      const sections = document.querySelectorAll('section[id]');
      const navLinks = document.querySelectorAll('nav a');
      function onScroll() {
        const scrollPos = window.scrollY + window.innerHeight / 3;
        sections.forEach(sec => {
          if (scrollPos >= sec.offsetTop && scrollPos < sec.offsetTop + sec.offsetHeight) {
            const id = sec.getAttribute('id');
            navLinks.forEach(link => {
              link.classList.toggle('active', link.getAttribute('href').endsWith(`#${id}`));
            });
          }
        });
      }
      window.addEventListener('scroll', onScroll);
      onScroll();
    }
  
    /** Validation basique du formulaire de contact */
    function initFormValidation() {
      const form = document.querySelector('form');
      if (!form) return;
      form.addEventListener('submit', e => {
        const name = form.querySelector('[name="name"]').value.trim();
        const email = form.querySelector('[name="email"]').value.trim();
        const message = form.querySelector('[name="message"]').value.trim();
        if (!name || !email || !message) {
          e.preventDefault();
          alert('Veuillez remplir tous les champs.');
        }
      });
    }
  
    document.addEventListener('DOMContentLoaded', () => {
      initMenuToggle();
      initSmoothScroll();
      initScrollSpy();
      initFormValidation();
    });
  
  })();
  