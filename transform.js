export function transform (data, before = '3000') {
    const cases = new Map();
    const districts = new Map();

    const filteredConfirmed = data.confirmed.filter(c => c.healthCareDistrict && c.date < before);
    
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
    
    data.features.forEach(f => {
        f.properties.center = [f.properties.X_COORD, f.properties.Y_COORD];
        const district = districts.get(f.properties.json_shp_nimi);
        if (district) {
            district.feature = f;
            district.caseRatio = district.cases.length / f.properties.population;
        }
    });
    
    const spread = filteredConfirmed
        .filter(c => {
            if ( typeof c.infectionSource !== 'number') {
                return false;
            }
            c.infectionDistrict = districts.get(cases.get(c.infectionSource).healthCareDistrict);
            return c.infectionDistrict.id !== c.healthCareDistrict;
        });

    return {
        cases,
        districts,
        spread
    }
}