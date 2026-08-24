import test from 'node:test';
import assert from 'node:assert/strict';
import { state } from '../../movie-catalog/public/assets/js/core/state.js';
import { renderTable } from '../../movie-catalog/public/assets/js/table/table.js';

class MockElement {
  constructor(tagName='div'){
    this.tagName=tagName.toUpperCase(); this.children=[]; this.dataset={}; this.style={};
    this.className=''; this.textContent=''; this.innerHTML=''; this.colSpan=1;
    this.href=''; this.target=''; this.rel=''; this.attributes=new Map(); this.listeners=new Map();
    this.classList={ _set:new Set(), add(n){this._set.add(n)}, contains(n){return this._set.has(n)}, toggle(n,f){const has=this._set.has(n); const en=f!==undefined?f:!has; if(en) this._set.add(n); else this._set.delete(n); return en;} };
  }
  setAttribute(k,v){this.attributes.set(k,String(v))} getAttribute(k){return this.attributes.get(k)??null} removeAttribute(k){this.attributes.delete(k)}
  addEventListener(t,fn){this.listeners.set(t,fn)} appendChild(c){this.children.push(c); return c} append(...cs){cs.forEach(c=>this.children.push(c))}
  querySelector(sel){ if(sel==='tbody') return this.tbody||null; return null; }
}
function makeTable(columns){
  const table=new MockElement('table'); const tbody=new MockElement('tbody'); table.tbody=tbody; table.querySelector=(sel)=>sel==='tbody'?tbody:null; return {table,tbody};
}
function makeRows(){
  return [
    { NUM:'1', FORMATTEDTITLE:'Arrival', YEAR:'2016', RATING:'7.9', FILESIZE:'1000', FILE:'arrival.mkv', URL:'https://example.com' },
    { NUM:'2', FORMATTEDTITLE:'Arrival 2', YEAR:'2020', RATING:'6.0', FILESIZE:'1200', FILE:'arrival2.mkv', URL:'https://example.com' },
    { NUM:'3', FORMATTEDTITLE:'The Arrival', YEAR:'1996', RATING:'5.5', FILESIZE:'800', FILE:'thearrival.mkv', URL:'https://example.com' },
  ];
}
test('separator appears between exact and fuzzy title matches',()=>{
  const columns=['NUM','FORMATTEDTITLE','YEAR','RATING','FILESIZE'];
  const {table,tbody}=makeTable(columns);
  globalThis.document={ createElement(tag){return new MockElement(tag)}, querySelector(){return null} };
  state.search={ FORMATTEDTITLE:'Arrival' }; state.columnVisibility={}; state.fuzzy=true;
  const rows=makeRows(); renderTable(table,rows,columns);
  assert.equal(tbody.children.length,4);
  const separator=tbody.children[1];
  assert.equal(separator.className,'exact-fuzzy-separator');
  assert.equal(separator.children[0].colSpan,columns.length);
});
test('no separator when no exact match',()=>{
  const columns=['NUM','FORMATTEDTITLE','YEAR','RATING','FILESIZE'];
  const {table,tbody}=makeTable(columns);
  globalThis.document={ createElement(tag){return new MockElement(tag)}, querySelector(){return null} };
  state.search={ FORMATTEDTITLE:'Nonexistent' }; state.columnVisibility={}; state.fuzzy=true;
  renderTable(table,makeRows(),columns);
  assert.equal(tbody.children.length,3);
});
test('no separator when all exact matches',()=>{
  const columns=['NUM','FORMATTEDTITLE','YEAR','RATING','FILESIZE'];
  const {table,tbody}=makeTable(columns);
  globalThis.document={ createElement(tag){return new MockElement(tag)}, querySelector(){return null} };
  state.search={ FORMATTEDTITLE:'Arrival' }; state.columnVisibility={}; state.fuzzy=false;
  const rows=[
    { NUM:'1', FORMATTEDTITLE:'Arrival', YEAR:'2016', RATING:'7.9', FILESIZE:'1000', FILE:'arrival.mkv', URL:'https://example.com' },
    { NUM:'2', FORMATTEDTITLE:'Arrival', YEAR:'2016', RATING:'7.9', FILESIZE:'1000', FILE:'arrival.mkv', URL:'https://example.com' },
  ];
  renderTable(table,rows,columns);
  assert.equal(tbody.children.length,2);
});
test('separator works with Title (Year) parsing',()=>{
  const columns=['NUM','FORMATTEDTITLE','YEAR','RATING','FILESIZE'];
  const {table,tbody}=makeTable(columns);
  globalThis.document={ createElement(tag){return new MockElement(tag)}, querySelector(){return null} };
  state.search={ FORMATTEDTITLE:'Arrival (2016)' }; state.columnVisibility={}; state.fuzzy=true;
  renderTable(table,makeRows(),columns);
  assert.equal(tbody.children.length,4);
});
