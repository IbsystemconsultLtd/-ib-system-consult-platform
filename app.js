const $=s=>document.querySelector(s);
const toast=(m)=>{const t=$("#toast");t.textContent=m;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2800)};
$("#menuBtn").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
document.querySelectorAll(".nav-link").forEach(a=>a.addEventListener("click",()=>$("#sidebar").classList.remove("open")));
document.querySelectorAll("[data-modal]").forEach(b=>b.addEventListener("click",()=>{$("#"+b.dataset.modal).classList.add("show")}));
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>b.closest(".modal").classList.remove("show")));
document.querySelectorAll(".modal").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)m.classList.remove("show")}));
document.querySelectorAll(".service-card").forEach(card=>card.querySelector("button").addEventListener("click",()=>toast(`${card.dataset.service}: request form will be enabled in the next build.`)));
$("#fundBtn").addEventListener("click",()=>{const a=Number($("#fundAmount").value);if(!a||a<100)return toast("Enter an amount of at least ₦100.");toast("Payment gateway will be connected during backend setup.");$("#fundModal").classList.remove("show")});
