/*
  Nombre completo: aj-category-model.js
  Ruta: core/models/aj-category-model.js

  Función:
    - Definir categorías iniciales, colores e íconos para AgendaJeff.
*/

"use strict";

const DEFAULT_CATEGORIES = Object.freeze([
  Object.freeze({ id: "trabajo", nombre: "Trabajo", color: "#2563eb", icono: "trabajo" }),
  Object.freeze({ id: "titulacion", nombre: "Titulación", color: "#7c3aed", icono: "graduacion" }),
  Object.freeze({ id: "personal", nombre: "Personal", color: "#15803d", icono: "persona" }),
  Object.freeze({ id: "clases", nombre: "Clases", color: "#b45309", icono: "libro" }),
  Object.freeze({ id: "otro", nombre: "Otro", color: "#475467", icono: "punto" })
]);

function normalizeCategoryId(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "otro";
}

function findCategory(categories, categoryId) {
  const list = Array.isArray(categories) && categories.length ? categories : DEFAULT_CATEGORIES;
  const cleanId = normalizeCategoryId(categoryId);
  return list.find(function findItem(category) { return category.id === cleanId; }) || list.find(function findOther(category) { return category.id === "otro"; }) || DEFAULT_CATEGORIES[4];
}

module.exports = Object.freeze({ DEFAULT_CATEGORIES, normalizeCategoryId, findCategory });
