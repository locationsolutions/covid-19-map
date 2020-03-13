import { transform } from './transform';
import months from './months';

const width = 300;
const height = 500;

const svg = d3.select("svg#map")
    .attr('width', width)
    .attr('height', height);

const projection = d3.geoMercator()
    .scale(1090)
    .center([24.5, 65.1])
    .translate([width / 2, height / 2]);

const path = d3.geoPath().projection(projection);

let hoverDistrict = null;
const numCasesSpan = document.getElementById('cases-num');
const ratioCasesSpan = document.getElementById('cases-ratio');
const districtNameSpan = document.getElementById('district-name');

Promise.all([
    fetch('https://vectiles.s3.eu-central-1.amazonaws.com/sairaanhoitopiiri2.topojson.json').then(r => r.json()),
    fetch('https://w3qa5ydb4l.execute-api.eu-west-1.amazonaws.com/prod/finnishCoronaData').then(r => r.json())
]).then(responses => {
    const topo = responses[0];
    const corona = responses[1];

    corona.features = topojson.feature(topo, topo.objects.SHP_population).features;

    const timeExtent = ['2020-02-26T10:17:15.000Z', d3.max(corona.confirmed, c => c.date)];
    const timeScale = d3.scaleTime()
        .domain(timeExtent.map(t => new Date(t)))
        .range([0, 100]);

    const allTime = transform(corona);

    const allTimeDistricts = Array.from(allTime.districts.values());
    const circleScale = d3.scalePow().exponent(0.5)
        .domain([1, d3.max(allTimeDistricts, d => d.cases.length)])
        .range([2, 20]);

    const fillColorScale = d3.scaleSequential(d3.interpolateOranges).domain([0, d3.max(allTimeDistricts, d => d.caseRatio * 2)]);


    function update(time) {
        const vis = transform(corona, time);

        const coronaDistricts = Array.from(vis.districts.values());

        svg.select('g.centers')
        .selectAll("circle")
        .data(coronaDistricts, d => d.id)
        .join(
            enter => enter
                    .append("circle")
                    .attr("cx", d => projection(d.feature.properties.center)[0])
                    .attr("cy", d => projection(d.feature.properties.center)[1])
                    .attr("r", d => circleScale(d.cases.length))
                    .attr('fill', 'rgba(153,31,61, 0.9)')
        ).attr("r", d => circleScale(d.cases.length));


        corona.features.forEach(d => {
            d.district = vis.districts.get(d.properties.json_shp_nimi);
        });

        svg.select('g.districts')
            .selectAll("path")
            .data(corona.features, d => d.id)
            .join(enter => 
                enter.append("path")
                    .attr("d", path)
                    .on("mouseover", handleMouseOver)
                    .on("mouseout", handleMouseOut)
            )
            .attr("fill", d => d.district ? fillColorScale(d.district.caseRatio || 0) : fillColorScale(0))
            .attr("stroke", d => d.id === hoverDistrict ? d3.interpolateOranges(0.6) : '#fff')
            .filter(d => d.id === hoverDistrict)
            .each(e => {
                let cases = 0;
                let ratio = 0;
                if (e.district) {
                    cases = e.district.cases.length;
                    ratio = (e.district.caseRatio * 100000).toFixed(1);
                }
                numCasesSpan.innerText = cases;
                ratioCasesSpan.innerText = ratio;
                districtNameSpan.innerText = e.properties.json_shp_nimi;
            })
            .raise();
    }

    
    const slider = document.getElementById('slider');
    const form = document.getElementById('slider-form');
    const dateSpan = document.getElementById('date');

    function fromSlider() {
        const date = timeScale.invert(slider.value);
        dateSpan.innerText = `Tartuntatilanne ${date.getDate()}. ${months[date.getMonth()]} ${date.getFullYear()}`;
        update(date.toISOString());
    }

    form.addEventListener('input', function() {
        fromSlider();
    }, true);

    function startAnim() {
        const ref = setInterval(() => {
            const newValue = Math.min(Number(slider.value) + 10, 100);
            if (newValue === 100) {
                clearInterval(ref);
            }
            slider.value = newValue;
            fromSlider();
        }, 1000);
    }

    const tooltip = document.getElementById('tooltip');
    function handleMouseOver (e) {
        tooltip.style.visibility = 'visible';
        const center = projection(e.properties.center);
        tooltip.style.left = center[0] + 'px';
        tooltip.style.bottom = height - center[1] + 'px';
        hoverDistrict = e.id;
        fromSlider();
    }
    function handleMouseOut (e) {
        tooltip.style.visibility = 'hidden';
        hoverDistrict = null;
        fromSlider();
    }

    fromSlider();
    startAnim();
});

