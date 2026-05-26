const fs = require('fs');
const path = require('path');

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, "/", file));
    }
  });

  return arrayOfFiles;
}

const tsxFiles = getAllFiles('src').filter(f => f.endsWith('.tsx'));
const fileContents = tsxFiles.map(f => fs.readFileSync(f, 'utf8'));

const stylesToCheck = {"index":["app","app-container","topbar","content-wrapper","logo","topdate","sub-tabs","sub-tab","active","bottom-nav","nav-item","main","main-view","view","diary-wrap","diary-title","diary-editor","j-block","j-floating-controls","j-ctrl-btn","j-drag-handle","dragging-active","j-content","is-empty","j-todo-cb","done","j-toggle-btn","open","j-children","collapsed","j-children-hint","j-toc-inner","toc-h1","toc-h2","toc-h3","j-toc-title","slash-menu","slash-cat","slash-item","selected","slash-shortcut","sec-hdr","sec-title","add-btn","prog-bar-wrap","prog-bar-label","prog-track","prog-fill","session-card","session-head","session-icon","session-meta","session-name","session-sub","prog-ring","prog-num","session-expand","session-body","step-list","step-item","step-name","step-check","step-dur","start-btn","tasks-list","task-item","task-name","task-cb","task-badge","badge-work","badge-health","badge-mind","badge-other","divider","goals-list","goal-item","goal-top","goal-name","goal-status","status-on","status-at","status-off","goal-prog-row","goal-prog-track","goal-prog-fill","fill-green","fill-amber","fill-red","fill-accent","goal-pct","static-list","static-card","static-top","static-emoji","static-info","static-name","static-note","static-bottom","static-status-row","static-prog-track","static-prog-fill","static-pct","static-tag","tag-life","tag-finance","tag-career","tag-health","tag-other","static-edit-row","sm-card","sm-head","sm-icon","sm-meta","sm-name","sm-sub","sm-actions","sm-btn","danger","sm-steps-preview","sm-step-row","sm-step-name","sm-step-dur","stats-grid","stat-card","stat-val","stat-lbl","stat-sub","streak-bar","streak-day","today","modal-overlay","modal","modal-handle","modal-title","form-field","modal-actions","btn-cancel","btn-save","session-runner","runner-header","runner-title","runner-close","runner-prog","runner-steps","runner-step","current","done-s","runner-step-num","runner-step-info","runner-step-name","runner-step-dur","runner-next","empty","app-content","tasks-view-container","tasks-header","tasks-title","tasks-avatar-btn","tasks-avatar-inner","tasks-tabs-row","tasks-tab-item","star-tab","tab-badge","add-list-tab","tasks-card","completed-tasks-card","tasks-card-header","tasks-card-title","tasks-card-actions","tasks-action-btn","tasks-dropdown-menu","dropdown-item","tasks-card-body","custom-tasks-list","custom-task-row","task-date-group","task-group-title","today-title","custom-task-checkbox","checkbox-inner","custom-task-details","custom-task-name","custom-task-time","custom-task-actions","custom-task-star-btn","custom-task-delete-btn","completed-accordion","completed-header","completed-body","tasks-empty-state","shared-fab","task-detail-overlay","task-detail-topbar","task-detail-back-btn","task-detail-action-btn","starred","task-detail-list-select-btn","task-detail-body","task-detail-title-input","task-detail-rows-container","task-detail-row","align-start","task-detail-row-icon","task-detail-row-content","task-detail-textarea","task-detail-add-row-btn","task-detail-pill","pill-clear-btn","pill-repeat-indicator","task-detail-subtasks-list","task-detail-subtask-item","task-detail-subtask-checkbox","checked","task-detail-subtask-input","completed","task-detail-subtask-delete","task-detail-subtask-form","form-plus-icon","task-detail-bottom-bar","task-detail-complete-btn","secondary","task-item-wrap","dragging","conflict-warning-modal","warning-title","warning-desc","warning-actions","warning-action-confirm","warning-action-cancel","task-deadline-span","diary-container","diary-scroll-area","diary-fab","recent-card","recent-header","recent-date-block","recent-date-month","recent-date-day","recent-title","recent-bookmark-btn","recent-image-grid","recent-grid-left","recent-grid-right","recent-grid-right-img","recent-grid-map","reflection-card","reflection-title-row","reflection-text","diary-section-title","diary-card-row","diary-card-left-img","diary-card-left-icon","diary-card-info","diary-card-date","diary-card-title","placeholder","diary-card-location","diary-bookmark-btn","editor-meta-row","editor-meta-field","editor-meta-input","ui-button","ui-button-primary","ui-button-secondary","ui-button-danger","ui-button-ghost","ui-button-icon","ui-button-sm","ui-button-md","ui-button-lg","ui-button-fullwidth","ui-card","ui-card-padded","ui-card-hoverable","ui-card-clickable","ui-input","ui-select","ui-textarea","root"],"app":["counter","hero","base","framework","vite","icon","logo","button-icon","ticks","center","next-steps","docs","spacer"]};

const results = {
  index: stylesToCheck.index.reduce((acc, s) => {
    acc[s] = fileContents.some(content => content.includes(s));
    return acc;
  }, {}),
  app: stylesToCheck.app.reduce((acc, s) => {
    acc[s] = fileContents.some(content => content.includes(s));
    return acc;
  }, {})
};

// Also check index.html for #root
const indexHtml = fs.readFileSync('index.html', 'utf8');
if (indexHtml.includes('root')) {
    results.index['root'] = true;
}

console.log(JSON.stringify(results));
