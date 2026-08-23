function toNonNegativeNumber(value) {
const number = Number(value);

return Number.isFinite(number) && number >= 0
? number
: 0;
}

function formatPercentage(value) {
const rounded =
Math.round(toNonNegativeNumber(value) * 10) / 10;

return `${rounded.toLocaleString(undefined, {
maximumFractionDigits: 1
})}%`;
}

function normalizeField(field, totalMovies) {
const missingCount = Math.min(
totalMovies,
toNonNegativeNumber(field?.missing_count)
);

const completeCount = Math.max(
0,
totalMovies - missingCount
);

return {
key: String(field?.key || '').trim(),
label: String(field?.label || '').trim(),
missingCount,
completeCount,
coverage: totalMovies > 0
? (completeCount / totalMovies) * 100
: 0,
coverageLabel: formatPercentage(
totalMovies > 0
? (completeCount / totalMovies) * 100
: 0
)
};
}

export function createMetadataCompletenessViewModel(
analytics,
totalMovies
) {
const total = Math.max(
toNonNegativeNumber(totalMovies),
toNonNegativeNumber(analytics?.total_movies),
toNonNegativeNumber(analytics?.complete_movies) +
toNonNegativeNumber(analytics?.incomplete_movies)
);

const completeMovies = Math.min(
total,
toNonNegativeNumber(analytics?.complete_movies)
);

const incompleteMovies = Math.max(
0,
total - completeMovies
);

const fields = Array.isArray(analytics?.fields)
? analytics.fields
.map(field => normalizeField(field, total))
.filter(field => field.key && field.label)
: [];

fields.sort((left, right) =>
right.missingCount - left.missingCount ||
left.label.localeCompare(right.label)
);

return {
totalMovies: total,
completeMovies,
incompleteMovies,
overallCoverageLabel: formatPercentage(
total > 0
? (completeMovies / total) * 100
: 0
),
monitoredFields: fields.length,
weakestField: fields[0] || null,
fields
};
}

function setText(id, value) {
const element = document.getElementById(id);

if (element) {
element.textContent = value;
}
}

function appendEmptyState(container, message) {
const empty = document.createElement('p');

empty.className = 'stats-chart-empty';
empty.textContent = message;

container.appendChild(empty);
}

function makeFieldInteractive(
row,
field,
onFieldSelect
) {
if (
field.missingCount === 0 ||
typeof onFieldSelect !== 'function'
) {
return;
}

row.classList.add('stat-card-action');
row.setAttribute('role', 'button');
row.tabIndex = 0;
row.title =
`Show movies missing ${field.label.toLowerCase()}`;

row.addEventListener(
'click',
() => onFieldSelect(field)
);

row.addEventListener('keydown', event => {
if (event.key !== 'Enter' && event.key !== ' ') return;

event.preventDefault();
row.click();
});
}

function renderFields(
container,
model,
onFieldSelect
) {
container.innerHTML = '';

if (model.fields.length === 0) {
appendEmptyState(
container,
'No metadata coverage data available.'
);
return;
}

model.fields.forEach(field => {
const row = document.createElement('div');

row.className = 'stats-origin-row';

row.setAttribute(
'aria-label',
`${field.label}: ${field.coverageLabel} complete, ` +
`${field.missingCount.toLocaleString()} missing`
);

makeFieldInteractive(
row,
field,
onFieldSelect
);

const label = document.createElement('strong');
label.textContent = field.label;
label.title = field.label;

const track = document.createElement('span');
track.className = 'stats-origin-track';

const bar = document.createElement('span');
bar.className = 'stats-origin-bar';
bar.style.width = `${field.coverage}%`;
bar.hidden = field.coverage === 0;

track.appendChild(bar);

const value = document.createElement('span');
value.className = 'stats-origin-value';
value.textContent =
`${field.coverageLabel} • ` +
`${field.missingCount.toLocaleString()}`;
value.title =
`${field.missingCount.toLocaleString()} missing`;

row.append(label, track, value);
container.appendChild(row);
});
}

export function renderMetadataCompleteness(
analytics,
totalMovies,
onFieldSelect
) {
const container = document.getElementById(
'metadata-completeness-fields'
);

if (!container) return false;

const model = createMetadataCompletenessViewModel(
analytics,
totalMovies
);

setText(
'metadata-overall-coverage',
model.overallCoverageLabel
);

setText(
'metadata-overall-coverage-detail',
`${model.completeMovies.toLocaleString()} complete • ` +
`${model.incompleteMovies.toLocaleString()} incomplete`
);

setText(
'metadata-complete-movies',
model.completeMovies.toLocaleString()
);

setText(
'metadata-complete-movies-detail',
model.totalMovies > 0
? `Across ${model.totalMovies.toLocaleString()} movies`
: 'No movies in collection'
);

setText(
'metadata-monitored-fields',
model.monitoredFields.toLocaleString()
);

setText(
'metadata-monitored-fields-detail',
model.monitoredFields > 0
? 'Click a field with gaps to review its movies'
: 'No field data available'
);

setText(
'metadata-weakest-field',
model.weakestField?.label || '–'
);

setText(
'metadata-weakest-field-detail',
model.weakestField
? `${model.weakestField.coverageLabel} complete • ` +
`${model.weakestField.missingCount.toLocaleString()} missing`
: 'No field data available'
);

setText(
'metadata-completeness-summary',
model.monitoredFields > 0
? `${model.monitoredFields.toLocaleString()} fields monitored`
: 'No metadata field data'
);

renderFields(
container,
model,
onFieldSelect
);

return true;
}
