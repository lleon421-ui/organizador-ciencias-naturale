const STORAGE_KEY = "organizadorCienciasNaturales_v1";
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const sampleTasks = [
  { id: crypto.randomUUID(), date: "2026-10-28", name: "Leer sobre la célula", category: "Biología", status: "Pendiente" },
  { id: crypto.randomUUID(), date: "2026-10-30", name: "Hacer mapa conceptual del ecosistema", category: "Ecología", status: "En proceso" },
  { id: crypto.randomUUID(), date: "2026-11-02", name: "Investigar sobre el cambio climático", category: "Medio ambiente", status: "Pendiente" },
  { id: crypto.randomUUID(), date: "2026-11-04", name: "Entregar trabajo de biodiversidad", category: "Biodiversidad", status: "Completada" }
];

let tasks = loadTasks();
let currentView = "inicio";
let calendarMonth = new Date().getMonth();
let calendarYear = new Date().getFullYear();
let toastTimer;

function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) return JSON.parse(saved);
  } catch (error) {
    console.warn("No fue posible leer las tareas guardadas.", error);
  }
  return sampleTasks;
}
function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    showToast("No se pudo guardar. Revisa la configuración del navegador.");
  }
}
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[char]);
}
function formatDate(dateString) {
  if (!dateString) return "Sin fecha";
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("es-CO");
}
function slugStatus(status) {
  return status.toLowerCase().replaceAll(" ", "-");
}
function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}
function filteredTasks() {
  const search = $("#searchInput").value.trim().toLocaleLowerCase("es");
  const status = $("#filterStatus").value;
  return tasks.filter(task => {
    const matchesSearch = `${task.name} ${task.category}`.toLocaleLowerCase("es").includes(search);
    return matchesSearch && (!status || task.status === status);
  }).sort((a, b) => a.date.localeCompare(b.date));
}
function updateSummary() {
  const completed = tasks.filter(t => t.status === "Completada").length;
  const percent = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
  $("#progressBar").style.width = `${percent}%`;
  $("#progressText").textContent = `${percent}% de tareas completadas (${completed} de ${tasks.length})`;
  $("#taskCount").textContent = `${tasks.length} ${tasks.length === 1 ? "tarea" : "tareas"}`;
  const today = new Date();
  today.setHours(0,0,0,0);
  const overdue = tasks.filter(t => t.status !== "Completada" && new Date(`${t.date}T00:00:00`) < today).length;
  $("#reminderText").textContent = overdue
    ? `Tienes ${overdue} tarea(s) vencida(s). ¡Revísalas hoy!`
    : "¡No olvides entregar tus tareas a tiempo!";
}
function renderTable(list) {
  if (!list.length) {
    $("#viewContent").innerHTML = `<div class="empty-state"><strong>🌱 No encontramos tareas</strong>Prueba otra búsqueda o agrega una nueva tarea.</div>`;
    return;
  }
  $("#viewContent").innerHTML = `
    <div class="table-wrap"><table>
      <thead><tr><th>Fecha</th><th>Tarea</th><th>Categoría</th><th>Estado</th><th>Acciones</th></tr></thead>
      <tbody>${list.map(task => `<tr>
        <td>${formatDate(task.date)}</td>
        <td>${escapeHTML(task.name)}</td>
        <td><span class="category-tag">${escapeHTML(task.category)}</span></td>
        <td><span class="status status-${slugStatus(task.status)}">${escapeHTML(task.status)}</span></td>
        <td><div class="row-actions">
          <button class="small-btn" data-edit="${task.id}" title="Editar tarea" aria-label="Editar ${escapeHTML(task.name)}">✏️</button>
          <button class="small-btn" data-delete="${task.id}" title="Eliminar tarea" aria-label="Eliminar ${escapeHTML(task.name)}">🗑️</button>
        </div></td>
      </tr>`).join("")}</tbody>
    </table></div>`;
}
function renderCalendar() {
  const firstDay = new Date(calendarYear, calendarMonth, 1);
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const offset = (firstDay.getDay() + 6) % 7;
  const monthName = firstDay.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
  const today = new Date();
  const cells = [];
  ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].forEach(day => cells.push(`<div class="calendar-day" style="min-height:auto;background:#eaf5e5;font-weight:800;text-align:center">${day}</div>`));
  for (let i = 0; i < offset; i++) cells.push(`<div class="calendar-day" aria-hidden="true"></div>`);
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${calendarYear}-${String(calendarMonth + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    const isToday = today.getFullYear() === calendarYear && today.getMonth() === calendarMonth && today.getDate() === day;
    const dayTasks = tasks.filter(t => t.date === dateKey);
    cells.push(`<div class="calendar-day ${isToday ? "today" : ""}"><strong>${day}</strong>${dayTasks.map(t => `<span class="calendar-task" title="${escapeHTML(t.name)}">${escapeHTML(t.name)}</span>`).join("")}</div>`);
  }
  $("#viewContent").innerHTML = `<div class="calendar-top"><button id="prevMonth" type="button">← Anterior</button><h3>${monthName.charAt(0).toUpperCase()+monthName.slice(1)}</h3><button id="nextMonth" type="button">Siguiente →</button></div><div class="calendar-grid">${cells.join("")}</div>`;
  $("#prevMonth").addEventListener("click", () => changeMonth(-1));
  $("#nextMonth").addEventListener("click", () => changeMonth(1));
}
function changeMonth(delta) {
  calendarMonth += delta;
  if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; }
  if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; }
  render();
}
function renderCategories() {
  const names = [...new Set(tasks.map(t => t.category).filter(Boolean))].sort((a,b) => a.localeCompare(b,"es"));
  if (!names.length) {
    $("#viewContent").innerHTML = `<div class="empty-state"><strong>Aún no hay categorías</strong>Agrega una tarea para crear tu primera categoría.</div>`;
    return;
  }
  $("#viewContent").innerHTML = `<div class="category-list">${names.map(name => {
    const count = tasks.filter(t => t.category === name).length;
    const done = tasks.filter(t => t.category === name && t.status === "Completada").length;
    return `<button class="category-card" data-category="${escapeHTML(name)}" style="text-align:left;color:inherit;cursor:pointer"><strong>📁 ${escapeHTML(name)}</strong><span>${count} tarea(s)</span><br><small>${done} completada(s) · Ver tareas →</small></button>`;
  }).join("")}</div>`;
}
function renderSettings() {
  $("#viewContent").innerHTML = `<div class="settings">
    <h3>Preferencias del organizador</h3>
    <div class="setting-row"><label for="themeSelect">Apariencia</label><select id="themeSelect"><option value="claro">Colores claros</option><option value="verde">Verde natural</option></select></div>
    <div class="setting-row"><span>Mis tareas guardadas</span><strong>${tasks.length}</strong></div>
    <button class="btn secondary" id="exportBtn">⬇️ Exportar tareas a CSV</button>
    <button class="btn secondary" id="resetBtn">↻ Restaurar tareas de ejemplo</button>
    <p class="form-hint">Las tareas se guardan solo en este navegador y dispositivo. Exporta una copia si deseas conservarla aparte.</p>
  </div>`;
  const theme = localStorage.getItem("organizadorTheme") || "claro";
  $("#themeSelect").value = theme;
  $("#themeSelect").addEventListener("change", event => {
    localStorage.setItem("organizadorTheme", event.target.value);
    document.body.classList.toggle("green-theme", event.target.value === "verde");
    showToast("Preferencia de apariencia guardada.");
  });
  $("#exportBtn").addEventListener("click", exportCSV);
  $("#resetBtn").addEventListener("click", () => {
    if (confirm("¿Quieres reemplazar tus tareas actuales por las tareas de ejemplo? Esta acción no se puede deshacer.")) {
      tasks = sampleTasks.map(t => ({...t, id: crypto.randomUUID()}));
      saveTasks(); render(); showToast("Tareas de ejemplo restauradas.");
    }
  });
}
function render() {
  const titles = { inicio: "Mis tareas", tareas: "Todas mis tareas", calendario: "Calendario de tareas", categorias: "Mis categorías", configuracion: "Configuración" };
  $("#panelTitle").textContent = titles[currentView] || "Mis tareas";
  $$(".nav-link").forEach(button => button.classList.toggle("active", button.dataset.view === currentView || (currentView === "inicio" && button.dataset.view === "inicio")));
  $("#searchInput").hidden = currentView === "calendario" || currentView === "configuracion";
  $("#filterStatus").hidden = currentView === "calendario" || currentView === "configuracion";
  updateSummary();
  if (currentView === "calendario") renderCalendar();
  else if (currentView === "categorias") renderCategories();
  else if (currentView === "configuracion") renderSettings();
  else renderTable(filteredTasks());
}
function openTaskDialog(task = null) {
  $("#taskForm").reset();
  $("#taskId").value = task?.id || "";
  $("#dialogTitle").textContent = task ? "Editar tarea" : "Agregar tarea";
  $("#taskName").value = task?.name || "";
  $("#taskDate").value = task?.date || new Date().toISOString().slice(0,10);
  $("#taskCategory").value = task?.category || "";
  $("#taskStatus").value = task?.status || "Pendiente";
  $("#taskDialog").showModal();
  $("#taskName").focus();
}
function editTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task) openTaskDialog(task);
}
function deleteTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  if (confirm(`¿Seguro que quieres eliminar "${task.name}"?`)) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks(); render(); showToast("Tarea eliminada.");
  }
}
function exportCSV() {
  const rows = [["Fecha","Tarea","Categoría","Estado"], ...tasks.map(t => [t.date,t.name,t.category,t.status])];
  const csv = "\uFEFF" + rows.map(row => row.map(value => `"${String(value).replaceAll('"','""')}"`).join(";")).join("\r\n");
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = "mis-tareas-ciencias-naturales.csv";
  document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  showToast("Archivo CSV exportado.");
}

document.addEventListener("click", event => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.view) {
    currentView = button.dataset.view;
    $("#searchInput").value = "";
    $("#filterStatus").value = "";
    render();
  }
  if (button.dataset.action === "add") openTaskDialog();
  if (button.dataset.action === "edit") {
    if (!tasks.length) return showToast("Primero agrega una tarea.");
    const id = prompt("Escribe el número de la tarea que quieres editar:\n" + tasks.map((t,i) => `${i+1}. ${t.name}`).join("\n"));
    const index = Number(id) - 1;
    if (id !== null && Number.isInteger(index) && tasks[index]) editTask(tasks[index].id);
    else if (id !== null) showToast("Número de tarea no válido.");
  }
  if (button.dataset.action === "delete") {
    if (!tasks.length) return showToast("No hay tareas para eliminar.");
    const id = prompt("Escribe el número de la tarea que quieres eliminar:\n" + tasks.map((t,i) => `${i+1}. ${t.name}`).join("\n"));
    const index = Number(id) - 1;
    if (id !== null && Number.isInteger(index) && tasks[index]) deleteTask(tasks[index].id);
    else if (id !== null) showToast("Número de tarea no válido.");
  }
  if (button.dataset.edit) editTask(button.dataset.edit);
  if (button.dataset.delete) deleteTask(button.dataset.delete);
  if (button.dataset.category) {
    currentView = "tareas";
    $("#searchInput").value = button.dataset.category;
    $("#filterStatus").value = "";
    render();
  }
});
$("#taskForm").addEventListener("submit", event => {
  event.preventDefault();
  const id = $("#taskId").value;
  const taskData = {
    id: id || crypto.randomUUID(),
    name: $("#taskName").value.trim(),
    date: $("#taskDate").value,
    category: $("#taskCategory").value.trim(),
    status: $("#taskStatus").value
  };
  if (!taskData.name || !taskData.date || !taskData.category) return showToast("Completa todos los campos.");
  if (id) {
    tasks = tasks.map(task => task.id === id ? taskData : task);
    showToast("Tarea actualizada correctamente.");
  } else {
    tasks.push(taskData);
    showToast("Tarea agregada correctamente.");
  }
  saveTasks();
  $("#taskDialog").close();
  currentView = "tareas";
  render();
});
$("#closeDialog").addEventListener("click", () => $("#taskDialog").close());
$("#cancelDialog").addEventListener("click", () => $("#taskDialog").close());
$("#searchInput").addEventListener("input", () => {
  if (!["inicio","tareas"].includes(currentView)) currentView = "tareas";
  render();
});
$("#filterStatus").addEventListener("change", () => {
  if (!["inicio","tareas"].includes(currentView)) currentView = "tareas";
  render();
});
const savedTheme = localStorage.getItem("organizadorTheme");
if (savedTheme === "verde") document.body.classList.add("green-theme");
render();
