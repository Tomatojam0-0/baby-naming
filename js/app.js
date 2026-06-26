/**
 * 主应用控制器
 */
var App = (function() {

  var WX_CN = {metal:"金",water:"水",wood:"木",fire:"火",earth:"土"};
  var WX_COLOR = {metal:"#888",water:"#3a6ea5",wood:"#6b9a5c",fire:"#c44a3c",earth:"#b8860b"};
  var WX_ICON = {metal:"metal",water:"water",wood:"wood",fire:"fire",earth:"earth"};

  function init() {
    // Tab 切换
    document.querySelectorAll('.tab-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        switchTab(btn.dataset.tab);
      });
    });

    // 复选框样式
    document.querySelectorAll('.checkbox-item').forEach(function(item) {
      item.addEventListener('click', function() {
        item.classList.toggle('active');
        var cb = item.querySelector('input');
        if (cb) cb.checked = item.classList.contains('active');
      });
    });

    // 起名按钮
    document.getElementById('nm-generate').addEventListener('click', doGenerate);
    // 测名按钮
    document.getElementById('ev-evaluate').addEventListener('click', doEvaluate);

    // 字库筛选
    ['lib-filter-wx','lib-filter-duti','lib-filter-gender','lib-sort'].forEach(function(id) {
      document.getElementById(id).addEventListener('change', renderLibrary);
    });

    // 初始化字库
    renderLibrary();

    // PWA 安装
    setupPWA();
  }

  function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
    document.querySelectorAll('.tab-content').forEach(function(c) { c.classList.remove('active'); });
    document.querySelector('[data-tab="' + tab + '"]').classList.add('active');
    document.getElementById('tab-' + tab).classList.add('active');
  }

  // ===== 起名 =====
  function doGenerate() {
    var surname = document.getElementById('nm-surname').value.trim();
    var gender = document.getElementById('nm-gender').value;
    var dateStr = document.getElementById('nm-date').value;
    var hour = parseInt(document.getElementById('nm-hour').value);
    var minute = parseInt(document.getElementById('nm-minute').value) || 0;
    var nameLength = parseInt(document.getElementById('nm-length').value);
    var avoidChars = document.getElementById('nm-avoid').value.trim();
    var preferDuti = document.getElementById('nm-duti').checked;
    var preferSimple = document.getElementById('nm-simple').checked;
    var preferNatural = document.getElementById('nm-natural').checked;

    if (!surname) { alert('请输入姓氏'); return; }
    if (!dateStr) { alert('请选择出生日期'); return; }

    var resultDiv = document.getElementById('nm-result');
    resultDiv.innerHTML = '<div class="loading"><div class="spinner"></div>正在排盘起名中...</div>';

    // 构建日期对象
    var parts = dateStr.split('-');
    var date = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]), hour, minute, 0);

    // 排八字
    var baziGender = (gender === 'male') ? 1 : 0;
    var bazi = BaziEngine.paipan(date, baziGender, 2);

    // 构建偏好
    var prefs = {
      gender: gender,
      preferDuti: preferDuti,
      maxStrokes: preferSimple ? 12 : 20,
      nameLength: nameLength,
      avoidChars: avoidChars,
      minScore: 55
    };

    // 生成名字
    setTimeout(function() {
      var names = NamingEngine.generateNames(surname, bazi.xiyong, prefs);

      // 如果偏好自然意境，提升自然标签的排序
      if (preferNatural) {
        names.forEach(function(n) {
          if (n.tags && n.tags.indexOf('自然') !== -1) {
            n.totalScore += 5;
          }
        });
        names.sort(function(a, b) { return b.totalScore - a.totalScore; });
      }

      resultDiv.innerHTML = renderBaziPanel(bazi) + renderNameResults(names.slice(0, 30));
    }, 100);
  }

  // ===== 渲染八字面板 =====
  function renderBaziPanel(bazi) {
    var p = bazi.pillars;
    var html = '<div class="card">';
    html += '<div class="card-title">八字命盘</div>';

    // 基本信息
    html += '<div style="font-size:13px;color:#888;margin-bottom:12px">';
    html += '阳历：' + bazi.solarStr + ' | ' + bazi.lunarStr + ' | 生肖：' + bazi.animal;
    html += ' | ' + (bazi.gender === 1 ? '男命' : '女命');
    html += '</div>';

    // 四柱表
    html += '<table class="bazi-table">';
    html += '<tr><th></th><th>天干</th><th>十神</th><th>地支</th><th>藏干</th><th>纳音</th></tr>';
    html += renderPillarRow('年柱', p.year);
    html += renderPillarRow('月柱', p.month);
    html += renderPillarRow('日柱(日主)', p.day);
    html += renderPillarRow('时柱', p.hour);
    html += '</table>';

    // 五行统计
    html += '<div style="margin-top:16px;font-size:13px;color:#888">五行力量分布</div>';
    html += '<div class="wx-bar">';
    var total = 0;
    Object.values(bazi.wxCount).forEach(function(v) { total += v; });
    Object.keys(bazi.wxCount).forEach(function(wx) {
      var pct = total > 0 ? Math.round(bazi.wxCount[wx] / total * 100) : 0;
      if (pct > 0) {
        html += '<div style="background:' + WX_COLOR[wx] + ';width:' + Math.max(pct, 8) + '%">' + WX_CN[wx] + ' ' + pct + '%</div>';
      }
    });
    html += '</div>';

    // 喜用神
    html += '<div class="xiyong-box">';
    html += '<div style="font-size:14px;font-weight:600;color:' + (--primaryDark) + '">喜用神分析</div>';
    html += '<div style="font-size:13px;color:#555;margin-top:6px">' + bazi.xiyong.reason + '</div>';
    html += '<div style="font-size:12px;color:#888;margin-top:4px">日主：' + bazi.dayMaster + '(' + WX_CN[bazi.dayMasterWX] + ') | 格局：' + bazi.xiyong.strength + '</div>';
    html += '<div class="xi-tags">';
    html += '<span style="font-size:12px;color:#888;margin-right:4px">喜用：</span>';
    bazi.xiyong.xi.forEach(function(wx) {
      html += '<span class="wx-tag xi">' + WX_CN[wx] + '</span>';
    });
    if (bazi.xiyong.ji.length > 0) {
      html += '<span style="font-size:12px;color:#888;margin:0 4px 0 8px">忌神：</span>';
      bazi.xiyong.ji.forEach(function(wx) {
        html += '<span class="wx-tag ji">' + WX_CN[wx] + '</span>';
      });
    }
    html += '</div>';
    html += '</div>';

    // 大运
    html += '<div style="margin-top:12px;font-size:13px;color:#888">大运（起运 ' + bazi.startAge + ' 岁）</div>';
    html += '<div class="dayun-list">';
    bazi.daYun.forEach(function(d, i) {
      if (!d.ganzhi) return;
      html += '<div class="dayun-item">';
      html += '<div class="dz">' + d.ganzhi + '</div>';
      html += '<div class="age">' + d.startAge + '-' + (d.startAge + 9) + '岁</div>';
      html += '</div>';
    });
    html += '</div>';

    html += '</div>';
    return html;
  }

  var primaryDark = '#0C447C';

  function renderPillarRow(label, pillar) {
    var ganWXClass = 'wx-' + pillar.ganWX;
    var zhiWXClass = 'wx-' + pillar.zhiWX;
    var hideStr = pillar.hide.map(function(h) {
      return '<span class="wx-' + (BaziEngine.GAN_WUXING[h] || 'metal') + '">' + h + '</span>';
    }).join(' ');
    return '<tr><td>' + label + '</td>' +
      '<td class="' + ganWXClass + '">' + pillar.gan + '<small style="font-size:11px;font-weight:400">' + WX_CN[pillar.ganWX] + '</small></td>' +
      '<td style="font-size:13px;color:#666">' + pillar.shishen + '</td>' +
      '<td class="' + zhiWXClass + '">' + pillar.zhi + '<small style="font-size:11px;font-weight:400">' + WX_CN[pillar.zhiWX] + '</small></td>' +
      '<td style="font-size:13px;">' + hideStr + '</td>' +
      '<td style="font-size:12px;color:#999">' + pillar.nayin + '</td>' +
      '</tr>';
  }

  // ===== 渲染名字结果 =====
  function renderNameResults(names) {
    if (names.length === 0) {
      return '<div class="card"><div class="empty-state">未找到符合条件的名字，请调整偏好后重试</div></div>';
    }

    var html = '<div class="card">';
    html += '<div class="card-title">推荐名字 · 共 ' + names.length + ' 个</div>';
    html += '<div class="name-grid">';

    names.forEach(function(name, i) {
      var isTop = i < 3;
      var scoreClass = name.totalScore >= 80 ? 'high' : (name.totalScore >= 65 ? 'mid' : 'low');
      var sg = name.sangge;

      html += '<div class="name-card' + (isTop ? ' top' : '') + '">';
      html += '<div class="score-badge ' + scoreClass + '">' + name.totalScore + '</div>';
      html += '<div class="hanzi">' + name.fullName + '</div>';
      html += '<div class="pinyin">' + name.pinyin + '</div>';
      html += '<div class="meaning">' + name.meaning + '</div>';

      // 标签
      html += '<div class="tags">';
      html += '<span class="tag">' + name.wuxing + '</span>';
      if (name.wxMatch) html += '<span class="tag">' + name.wxMatch.desc.substring(0, 20) + '</span>';
      name.tags.forEach(function(t) { html += '<span class="tag">' + t + '</span>'; });
      html += '</div>';

      // 三才五格
      html += '<div class="sg-detail">';
      html += renderSGItem('天格', sg.tianGe);
      html += renderSGItem('人格', sg.renGe);
      html += renderSGItem('地格', sg.diGe);
      html += renderSGItem('外格', sg.waiGe);
      html += renderSGItem('总格', sg.zongGe);
      html += '</div>';

      html += '</div>';
    });

    html += '</div>';
    html += '</div>';
    return html;
  }

  function renderSGItem(label, ge) {
    var luckClass = ge.shuli.score > 0 ? 'sg-good' : (ge.shuli.score < 0 ? 'sg-bad' : '');
    return '<div class="sg-item">' +
      '<div class="sg-label">' + label + '</div>' +
      '<div class="sg-value ' + luckClass + '">' + ge.num + '</div>' +
      '<div class="sg-label ' + luckClass + '">' + ge.shuli.luck + '</div>' +
      '</div>';
  }

  // ===== 测名 =====
  function doEvaluate() {
    var surname = document.getElementById('ev-surname').value.trim();
    var nameStr = document.getElementById('ev-name').value.trim();
    var dateStr = document.getElementById('ev-date').value;
    var hour = parseInt(document.getElementById('ev-hour').value);
    var gender = parseInt(document.getElementById('ev-gender').value);

    if (!surname) { alert('请输入姓氏'); return; }
    if (!nameStr) { alert('请输入待测名字'); return; }
    if (!dateStr) { alert('请选择出生日期'); return; }

    var resultDiv = document.getElementById('ev-result');
    resultDiv.innerHTML = '<div class="loading"><div class="spinner"></div>正在分析中...</div>';

    var parts = dateStr.split('-');
    var date = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]), hour, 0, 0);

    var bazi = BaziEngine.paipan(date, gender, 2);

    setTimeout(function() {
      var result = NamingEngine.evaluateName(surname, nameStr, bazi.xiyong);
      resultDiv.innerHTML = renderBaziPanel(bazi) + renderEvalResult(result);
    }, 100);
  }

  function renderEvalResult(result) {
    var scoreClass = result.totalScore >= 75 ? 'high' : (result.totalScore >= 55 ? 'mid' : 'low');
    var scoreLabel = result.totalScore >= 80 ? '优秀' : (result.totalScore >= 65 ? '良好' : (result.totalScore >= 45 ? '一般' : '欠佳'));

    var html = '<div class="card eval-result">';
    html += '<div class="card-title">名字评估报告</div>';

    // 分数环
    html += '<div style="text-align:center;margin-bottom:20px">';
    html += '<div class="score-ring ' + scoreClass + '">';
    html += '<div class="score-num">' + result.totalScore + '</div>';
    html += '<div class="score-label">' + scoreLabel + '</div>';
    html += '</div>';
    html += '<div style="font-size:24px;font-weight:700;font-family:var(--font-serif);letter-spacing:4px">' + result.fullName + '</div>';
    html += '<div style="font-size:13px;color:#888;margin-top:4px">五行：' + result.wuxing + '</div>';
    html += '</div>';

    // 三才五格
    if (result.sangge) {
      var sg = result.sangge;
      html += '<div class="sg-detail" style="grid-template-columns:repeat(5,1fr);margin-bottom:16px">';
      html += renderSGItem('天格', sg.tianGe);
      html += renderSGItem('人格', sg.renGe);
      html += renderSGItem('地格', sg.diGe);
      html += renderSGItem('外格', sg.waiGe);
      html += renderSGItem('总格', sg.zongGe);
      html += '</div>';

      // 三才配置
      html += '<div style="font-size:13px;color:#666;margin-bottom:12px">';
      var scLevel = sg.sanCai.level;
      var scColor = scLevel === 'good' ? 'var(--success)' : (scLevel === 'bad' ? 'var(--danger)' : 'var(--warning)');
      html += '三才配置：<span style="color:' + scColor + ';font-weight:600">' + sg.sanCai.detail + '</span>';
      html += '</div>';
    }

    // 含义
    html += '<div style="font-size:13px;color:#555;margin-bottom:12px;padding:10px;background:#f8faff;border-radius:8px">';
    html += '<strong>字义：</strong>' + result.meaning;
    html += '</div>';

    // 建议列表
    if (result.suggestions.length > 0) {
      html += '<div style="font-size:14px;font-weight:600;margin-bottom:8px;color:var(--primary-dark)">分析建议</div>';
      html += '<ul class="suggestion-list">';
      result.suggestions.forEach(function(s) {
        html += '<li class="' + s.type + '">';
        if (s.type === 'warning') html += '<span>⚠️</span>';
        else if (s.type === 'good') html += '<span>✅</span>';
        else html += '<span>💡</span>';
        html += '<div>' + s.msg;
        if (s.alternatives && s.alternatives.length > 0) {
          html += '<div style="margin-top:6px">';
          s.alternatives.forEach(function(alt) {
            html += '<span class="alt-name" data-name="' + alt.name + '">' + alt.name + ' (' + alt.score + '分)</span>';
          });
          html += '</div>';
        }
        html += '</div>';
        html += '</li>';
      });
      html += '</ul>';
    }

    // 未收录字提示
    if (result.notFound.length > 0) {
      html += '<div style="font-size:12px;color:var(--warning);margin-top:8px">注：以下字未在字库中找到，笔画数可能不准确：' + result.notFound.join('、') + '</div>';
    }

    html += '</div>';

    // 绑定替代名点击事件
    setTimeout(function() {
      document.querySelectorAll('.alt-name').forEach(function(el) {
        el.addEventListener('click', function() {
          var fullName = el.dataset.name;
          var surname = fullName[0];
          var nameStr = fullName.substring(1);
          document.getElementById('ev-surname').value = surname;
          document.getElementById('ev-name').value = nameStr;
          doEvaluate();
        });
      });
    }, 50);

    return html;
  }

  // ===== 字库浏览 =====
  function renderLibrary() {
    var filterWX = document.getElementById('lib-filter-wx').value;
    var filterDuti = document.getElementById('lib-filter-duti').value;
    var filterGender = document.getElementById('lib-filter-gender').value;
    var sortBy = document.getElementById('lib-sort').value;

    var chars = CHAR_DB.filter(function(ch) {
      if (ch.t && ch.t.indexOf('姓氏') !== -1) return false;
      if (filterWX && ch.w !== filterWX) return false;
      if (filterDuti === 'true' && !ch.d) return false;
      if (filterGender && ch.g !== filterGender) return false;
      return true;
    });

    if (sortBy === 'strokes') {
      chars.sort(function(a, b) { return a.s - b.s; });
    } else {
      var wxOrder = {metal:0, water:1, wood:2, fire:3, earth:4};
      chars.sort(function(a, b) {
        if (wxOrder[a.w] !== wxOrder[b.w]) return wxOrder[a.w] - wxOrder[b.w];
        return a.s - b.s;
      });
    }

    var html = '<div style="font-size:13px;color:#888;margin-bottom:12px">共 ' + chars.length + ' 字</div>';
    html += '<div class="char-grid">';
    chars.forEach(function(ch) {
      html += '<div class="char-cell">';
      html += '<div class="char wx-' + ch.w + '">' + ch.c + '</div>';
      html += '<div class="info"><span class="wx-dot" style="background:' + WX_COLOR[ch.w] + '"></span>';
      html += WX_CN[ch.w] + ' ' + ch.s + '画' + (ch.d ? ' 独体' : '') + '</div>';
      html += '</div>';
    });
    html += '</div>';

    document.getElementById('lib-grid').innerHTML = html;
  }

  // ===== PWA 安装 =====
  var deferredPrompt = null;
  function setupPWA() {
    window.addEventListener('beforeinstallprompt', function(e) {
      e.preventDefault();
      deferredPrompt = e;
      document.getElementById('install-banner').classList.add('show');
    });

    document.getElementById('install-btn').addEventListener('click', function() {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function() {
          document.getElementById('install-banner').classList.remove('show');
          deferredPrompt = null;
        });
      }
    });

    document.getElementById('install-close').addEventListener('click', function() {
      document.getElementById('install-banner').classList.remove('show');
    });

    // 注册 Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(function(err) {
        console.log('SW registration failed:', err);
      });
    }
  }

  return { init: init };
})();

document.addEventListener('DOMContentLoaded', App.init);
