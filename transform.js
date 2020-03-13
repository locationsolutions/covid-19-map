export function transform (data, before = '3000') {
    const cases = new Map();
    const districts = new Map();

    const filteredConfirmed = data.confirmed.filter(c => c.date < before);
    
    filteredConfirmed.forEach(c => {
        cases.set(Number(c.id), c);


        let val = districts.get(c.healthCareDistrict);
        if (!val) {
            val = {
                id: c.healthCareDistrict,
                cases: []
            }
        }
        val.cases.push(c);
        districts.set(c.healthCareDistrict, val);
    });
    const edges = new Map();
    filteredConfirmed
        .filter(c => typeof c.infectionSource === 'number')
        .forEach(c => {
            const key = cases.get(c.infectionSource).healthCareDistrict + '%%' + c.healthCareDistrict;
            let val = edges.get(key);
            if (!val) {
                val = 0;
            }
            val++;
            edges.set(key, val);
        });

    data.features.forEach(f => {
        f.properties.center = [f.properties.X_COORD, f.properties.Y_COORD];
        const district = districts.get(f.properties.json_shp_nimi);
        if (district) {
            district.feature = f;
            district.caseRatio = district.cases.length / f.properties.population;
        }
    });

    return {
        cases,
        districts,
        edges
    }
}