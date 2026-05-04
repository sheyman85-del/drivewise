(function(){
  var API = (typeof window !== "undefined" && window.API) || "https://swung-blunderer-happiest.ngrok-free.dev";
  
  function extractRegion(){
    var pi = document.getElementById('pi');
    var locName = (window.pu && window.pu.name) || (pi && pi.value) || '';
    if (!locName) return null;
    // Strip parens, then remove airport/station/etc keywords, take FIRST word
    var clean = locName.toLowerCase()
      .replace(/\(.*?\)/g, '')
      .replace(/\b(int|airport|station|hotel|terminal|beach|downtown|city|mall|coral|gables|north|south|east|west|miracle|mkt|center|centre|gare|train|rail|us|fr|de|uk|es|it|il|ae|jp)\b/gi, '')
      .replace(/[\/\-\,\.]/g, ' ')
      .trim();
    var words = clean.split(/\s+/).filter(Boolean);
    return words[0] || null;
  }
  
  function ensureButton(){
    if (document.getElementById('arb-main-btn')) return;
    var searchBtn = document.getElementById('sbtn');
    if (!searchBtn) { setTimeout(ensureButton, 500); return; }
    var btn = document.createElement('button');
    btn.id = 'arb-main-btn';
    btn.type = 'button';
    btn.style.cssText = 'width:100%;padding:14px;background:#fff;color:#e63946;border:2px solid #e63946;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;margin-top:10px;display:flex;align-items:center;justify-content:center;gap:8px';
    btn.innerHTML = '<span style="font-size:18px">🎯</span> ARBITRAGE: Compare All Locations';
    btn.addEventListener('click', runArb);
    searchBtn.parentNode.insertBefore(btn, searchBtn.nextSibling);
    console.log('[Arbitrage] Button installed');
  }
  
  function runArb(e){
    if (e) { e.preventDefault(); e.stopPropagation(); }
    console.log('[Arbitrage] Button clicked');
    
    var pi = document.getElementById('pi');
    var pd = document.getElementById('pd').value;
    var rd = document.getElementById('rd').value;
    var cu = document.getElementById('cu').value;
    
    if (!pi.value) { alert('Please select a pickup location'); return; }
    if (!pd || !rd) { alert('Please select dates'); return; }
    
    var region = extractRegion();
    if (!region) { alert('Could not detect region from: ' + pi.value); return; }
    
    var btn = document.getElementById('arb-main-btn');
    btn.disabled = true;
    btn.innerHTML = '⏳ Scanning all ' + region + ' locations... ~2 min';
    
    var url = API + '/api/arbitrage?region=' + encodeURIComponent(region) + '&pickup=' + pd + '&dropoff=' + rd + '&currency=' + cu;
    console.log('[Arbitrage] Fetching:', url);
    
    fetch(url, {
        headers:{'ngrok-skip-browser-warning':'true'},
        signal: AbortSignal.timeout(720000)
      })
      .then(function(r){ 
        console.log('[Arbitrage] Response:', r.status);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json(); 
      })
      .then(function(data){
        console.log('[Arbitrage] Data:', data);
        showModal(data, region, pd, rd, cu);
        btn.disabled = false;
        btn.innerHTML = '<span style="font-size:18px">🔄</span> ARBITRAGE: Re-scan ' + region;
      })
      .catch(function(e){
        console.error('[Arbitrage] Error:', e);
        alert('Arbitrage error: ' + e.message);
        btn.disabled = false;
        btn.innerHTML = '<span style="font-size:18px">🎯</span> ARBITRAGE: Compare All Locations';
      });
  }
  
  function showModal(data, region, pd, rd, cu){
    var sym = ({USD:'$',EUR:'€',GBP:'£',ILS:'₪',AED:'د.إ',CAD:'CA$'})[cu] || '$';
    var days = Math.max(1, Math.ceil((new Date(rd) - new Date(pd))/(1000*60*60*24)));
    var modal = document.createElement('div');
    modal.id = 'arb-modal';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:99999;display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow-y:auto';
    modal.onclick = function(e){ if (e.target === modal) modal.remove(); };
    
    var html = '<div style="background:#fff;border-radius:14px;padding:24px;max-width:720px;width:100%;position:relative;margin-top:40px">';
    html += '<button onclick="document.getElementById(\'arb-modal\').remove()" style="position:absolute;top:12px;right:12px;background:#f4f5f7;border:none;width:36px;height:36px;border-radius:18px;cursor:pointer;font-size:22px;font-weight:700">×</button>';
    html += '<h2 style="margin:0 0 8px;font-size:22px;font-weight:800">🎯 ' + region.toUpperCase() + ' Arbitrage</h2>';
    html += '<div style="font-size:13px;color:#9aa3b2;margin-bottom:20px">' + pd + ' → ' + rd + ' · ' + days + ' days · ' + cu + '</div>';
    
    if (!data.arbitrage){
      html += '<div style="color:#e63946;padding:20px;text-align:center">Need 2+ scans. Got ' + data.successfulScans + ' of ' + data.scannedLocations + '.</div>';
    } else {
      var a = data.arbitrage;
      var totalSave = (a.maxSavingsPerDay * days).toFixed(2);
      html += '<div style="display:grid;grid-template-columns:1fr 60px 1fr;gap:12px;margin-bottom:14px">';
      html += '<div style="background:#d4f7e7;border:2px solid #2d9e6b;border-radius:10px;padding:14px;text-align:center">';
      html += '<div style="font-size:11px;font-weight:700;color:#2d9e6b">CHEAPEST</div>';
      html += '<div style="font-size:13px;font-weight:600;margin:4px 0">' + a.bestLocation + '</div>';
      html += '<div style="font-size:24px;font-weight:800;color:#2d9e6b">' + sym + a.bestPrice + '/day</div></div>';
      html += '<div style="display:flex;align-items:center;justify-content:center;font-weight:800;color:#9aa3b2">VS</div>';
      html += '<div style="background:#fde8e8;border:2px solid #e63946;border-radius:10px;padding:14px;text-align:center">';
      html += '<div style="font-size:11px;font-weight:700;color:#e63946">EXPENSIVE</div>';
      html += '<div style="font-size:13px;font-weight:600;margin:4px 0">' + a.worstLocation + '</div>';
      html += '<div style="font-size:24px;font-weight:800;color:#e63946">' + sym + a.worstPrice + '/day</div></div></div>';
      html += '<div style="background:#fff7d6;border:2px solid #f59e0b;border-radius:10px;padding:14px;text-align:center;margin-bottom:14px">';
      html += '<div style="font-size:11px;font-weight:700;color:#92400e">PICK UP AT ' + a.bestLocation.toUpperCase() + '</div>';
      html += '<div style="font-size:28px;font-weight:800;color:#f59e0b;margin:4px 0">' + sym + a.maxSavingsPerDay.toFixed(2) + '/day saved</div>';
      html += '<div style="font-size:14px;font-weight:600;color:#92400e">= ' + sym + totalSave + ' for ' + days + ' days</div></div>';
      html += '<div style="font-size:11px;font-weight:700;color:#9aa3b2;text-transform:uppercase;margin-bottom:8px">All ' + data.locations.length + ' locations:</div>';
      for (var i=0; i<data.locations.length; i++){
        var loc = data.locations[i];
        html += '<div style="padding:10px 14px;border-radius:8px;background:' + (i===0?'#d4f7e7':'#f4f5f7') + ';margin-bottom:5px;display:flex;justify-content:space-between">';
        html += '<span style="font-weight:' + (i===0?'700':'500') + '">' + (i+1) + '. ' + loc.location + '</span>';
        html += '<span style="font-weight:700">' + sym + loc.cheapestPrice + '/day · ' + loc.totalDeals + ' cars</span></div>';
      }
    }
    html += '</div>';
    modal.innerHTML = html;
    document.body.appendChild(modal);
  }
  
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureButton);
  else ensureButton();
  setTimeout(ensureButton, 1000);
  setTimeout(ensureButton, 3000);
  
  window.runArb = runArb;
})();