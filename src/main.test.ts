import {ObjectId} from "bson";

const {diff} = require('./main');

let _id = new ObjectId();

describe(`simple objects _id:'${_id}'`, () => {
	test('diff none object', () => {
		expect(diff(1, 1)).toBeTruthy();
	});

	test('diff null object', () => {
		expect(diff(null, {})).toBeFalsy();
	});

	test('root: no change', () => {
		let oldDoc = {_id, month: "may"};
		let newDoc = {_id, month: "may"};
		expect(diff(oldDoc, newDoc)).toBeFalsy();
	});

	test('root: no change on date', () => {
		let date = new Date();
		let oldDoc = {_id, month: date};
		let newDoc = {_id, month: date};
		expect(diff(oldDoc, newDoc)).toBeFalsy();
	});

	test('root: change on date', () => {
		let date1 = new Date();
		let date2 = new Date().setDate(1);
		let oldDoc = {_id, month: date1};
		let newDoc = {_id, month: date2};
		let expectedResult = [{query: {_id}, update: {$set: {month: date2}}}];
		expect(diff(oldDoc, newDoc)).toEqual(expectedResult);
	});

	test('root: one change', () => {
		let oldDoc = {_id, month: "may"};
		let newDoc = {_id, month: "april"};
		let expectedResult = [{query: {_id}, update: {$set: {month: "april"}}}];
		expect(diff(oldDoc, newDoc)).toEqual(expectedResult);
	});

	test('root: text to object', () => {
		let oldDoc = {_id, title: "Roze"};
		let newDoc = {_id, title: {"en": "Roze"}};
		let expectedResult = [{query: {_id}, update: {$set: {title: {"en": "Roze"}}}}];
		expect(diff(oldDoc, newDoc)).toEqual(expectedResult);
	});

	test('root: object to text', () => {
		let oldDoc = {_id, title: {"en": "Roze"}};
		let newDoc = {_id, title: "Roze"};
		let expectedResult = [{query: {_id}, update: {$set: {title: "Roze"}}}];
		expect(diff(oldDoc, newDoc)).toEqual(expectedResult);
	});

	test('root: two changes', () => {
		let oldDoc = {_id, month: "may", day: 1};
		let newDoc = {_id, month: "april", day: 2};
		let expectedResult = [{query: {_id}, update: {$set: {month: "april", day: 2}}}];
		expect(diff(oldDoc, newDoc)).toEqual(expectedResult);
	});

	test('root: one change and one delete', () => {
		let oldDoc = {_id, month: "may", day: 1};
		let newDoc = {_id, month: "april"};
		let expectedResult = [{query: {_id}, update: {$set: {month: "april"}, $unset: {day: ""}}}];

		expect(diff(oldDoc, newDoc)).toEqual(expectedResult);
	});

	test('root: one change, one delete and one add', () => {
		let oldDoc = {_id, month: "may", day: 1};
		let newDoc = {_id, month: "april", year: 2020};
		let expectedResult = [{query: {_id}, update: {$set: {year: 2020, month: "april"}, $unset: {day: ""}}}];

		expect(diff(oldDoc, newDoc)).toEqual(expectedResult);
	});

	test('level2: one change', () => {
		let oldDoc = {_id, address: {no: 5, city: "London"}};
		let newDoc = {_id, address: {city: "Paris", no: 5}};
		let expectedResult = [{query: {_id}, update: {$set: {"address.city": "Paris"}}}];

		expect(diff(oldDoc, newDoc)).toEqual(expectedResult);
	});

	test('level3: one change, one add, one remove', () => {
		let oldDoc = {_id, address: {city: "London", no: 5, location: {x: 50, y: 20}}};
		let newDoc = {_id, address: {city: "Paris", location: {y: 22, z: 17}}};
		let expectedResult = [{
			query: {_id},
			update: {
				$set: {"address.city": "Paris", "address.location.y": 22, "address.location.z": 17},
				$unset: {"address.location.x": "", "address.no": ""}
			}
		}];

		expect(diff(oldDoc, newDoc)).toEqual(expectedResult);
	});
});

describe('array change', () => {
	test('level1 one change', () => {
		let oldDoc = {_id, addresses: [{city: "London", no: 5}]};
		let newDoc = {_id, addresses: [{city: "Paris", no: 5}]};

		let expectedResult = [{
			query: {_id},
			update: {
				$set: {"addresses.0.city": "Paris"}
			}
		}];

		expect(diff(oldDoc, newDoc)).toEqual(expectedResult);
	});

	test('level1 one change, one item add', () => {
		let oldDoc = {_id, addresses: [{city: "London", no: 5}]};
		let newDoc = {_id, addresses: [{city: "Paris", no: 5}, {city: "Istanbul", no: 8}]};

		let expectedResult = [{
			query: {_id},
			update: {
				$set: {"addresses.0.city": "Paris", "addresses.1": {city: "Istanbul", no: 8}}
			}
		}];

		expect(diff(oldDoc, newDoc)).toEqual(expectedResult);
	});

	test('level1 one change, one item delete', () => {
		let oldDoc = {_id, addresses: [{city: "London", no: 5}, {city: "Istanbul", no: 8}]};
		let newDoc = {_id, addresses: [{city: "Paris", no: 5}]};

		let expectedResult = [{
			query: {_id},
			update: {
				$set: {"addresses.0.city": "Paris"}, $unset: {"addresses.1": ""}
			}
		}];

		expect(diff(oldDoc, newDoc)).toEqual(expectedResult);
	});

	test('level2 one change, one item add', () => {
		let oldDoc = {_id, addresses: [{city: "London", streets: [{name: "x-10"}]}]};
		let newDoc = {_id, addresses: [{city: "London", streets: [{name: "y-20"}, {name: "z-30"}]}]};

		let expectedResult = [{
			query: {_id},
			update: {
				$set: {"addresses.0.streets.0.name": "y-20", "addresses.0.streets.1": {name: "z-30"}}
			}
		}];

		expect(diff(oldDoc, newDoc)).toEqual(expectedResult);
	});
});

describe('array change with _id', () => {
	let item1Id = new ObjectId("5e4c21b8b9858718ac777301");
	let item2Id = new ObjectId("5e4c21b8b9858718ac777302");
	let item3Id = new ObjectId("5e4c21b8b9858718ac777303");
	let item4Id = new ObjectId("5e4c21b8b9858718ac777304");

	test('no change', () => {
		let oldDoc = {_id, addresses: [{_id: item1Id, city: "London", no: null}]};
		let newDoc = {_id, addresses: [{_id: item1Id, city: "London", no: null}]};

		expect(diff(oldDoc, newDoc)).toBeFalsy();
	});

	test('one change', () => {
		let oldDoc = {_id, addresses: [{_id: item1Id, city: "London", no: 5}]};
		let newDoc = {_id, addresses: [{_id: item1Id, city: "London", no: 6}]};

		let expectedResult = [{
			query: {_id},
			update: {
				$set: {"addresses.$[item1].no": 6}
			},
			options: {
				arrayFilters: [{"item1._id": item1Id}]
			}
		}];

		expect(diff(oldDoc, newDoc)).toEqual(expectedResult);
	});

	test(`one item change and one item add`, () => {
		let oldDoc = {_id, addresses: [{_id: item1Id, city: "London"}]};
		let newDoc = {_id, addresses: [{_id: item1Id, city: "Tehran"}, {_id: item2Id, city: "Paris"}]};

		let expectedResult = [{
			query: {_id},
			update: {
				$set: {"addresses.$[item1].city": "Tehran", "addresses.$[item2]": {_id: item2Id, city: "Paris"}},
			},
			options: {
				arrayFilters: [{"item1._id": item1Id}, {"item2._id": item2Id}]
			}
		}];

		expect(diff(oldDoc, newDoc)).toEqual(expectedResult);
	});

	test(`one item delete, one item change, one item insert, change order`, () => {
		let oldDoc = {
			_id, addresses: [
				{_id: item1Id, city: "London"},
				{_id: item2Id, city: "Paris"},
				{_id: item4Id, city: "Tehran"}
			]
		};
		let newDoc = {
			_id, addresses: [
				{_id: item2Id, city: "Paris"},
				{_id: item1Id, city: "Sidney"},
				{_id: item3Id, city: "LA"}
			]
		};

		let expectedResult = [{
			query: {_id},
			update: {
				$set: {"addresses.$[item1].city": "Sidney", "addresses.$[item3]": {_id: item3Id, city: "LA"}},
				$unset: {"addresses.$[item2]": ""},
			},
			options: {
				arrayFilters: [{"item1._id": item1Id}, {"item2._id": item4Id}, {"item3._id": item3Id}]
			}
		}];

		expect(diff(oldDoc, newDoc)).toEqual(expectedResult);
	});

	test(`level 2 change, one add`, () => {
		let item11Id = new ObjectId("5e4c21b8b9858718ac777311");
		let item12Id = new ObjectId("5e4c21b8b9858718ac777312");
		let item13Id = new ObjectId("5e4c21b8b9858718ac777313");

		let oldDoc = {
			_id, addresses: [
				{
					_id: item1Id, cities: [
						{_id: item11Id, name: "London"},
						{_id: item12Id, name: "Paris"}
					]
				}
			]
		};
		let newDoc = {
			_id, addresses: [
				{
					_id: item1Id, cities: [
						{_id: item11Id, name: "London"},
						{_id: item12Id, name: "Sydney"},
						{_id: item13Id, name: "Delhi"}
					]
				}
			]
		};

		let expectedResult = [{
			query: {_id},
			update: {
				$set: {
					"addresses.$[item1].cities.$[item2].name": "Sydney",
					"addresses.$[item3].cities.$[item4]": {_id: item13Id, name: "Delhi"}
				},
			},
			options: {
				arrayFilters: [{"item1._id": item1Id}, {"item2._id": item12Id}, {"item3._id": item1Id}, {"item4._id": item13Id}]
			}
		}];

		expect(diff(oldDoc, newDoc)).toEqual(expectedResult);
	});

	test(`level 2 multiple arrays`, () => {
		let item11Id = new ObjectId("5e4c21b8b9858718ac777311");
		let item12Id = new ObjectId("5e4c21b8b9858718ac777312");
		let item13Id = new ObjectId("5e4c21b8b9858718ac777313");

		let oldDoc = {
			_id, addresses: [
				{
					_id: item1Id, cities: [
						{_id: item11Id, name: "London"}
					]
				}
			],
			locales: [
				{_id: item12Id, name: "EN"},
				{_id: item13Id, name: "AR"}
			]
		};
		let newDoc = {
			_id, addresses: [
				{
					_id: item1Id, cities: [
						{_id: item11Id, name: "Sydney"}
					]
				}
			],
			locales: [
				{_id: item12Id, name: "EN"}
			]
		};

		let expectedResult = [{
			query: {_id},
			update: {
				$set: {"addresses.$[item1].cities.$[item2].name": "Sydney"},
				$unset: {"locales.$[item3]": ""}
			},
			options: {
				arrayFilters: [{"item1._id": item1Id}, {"item2._id": item11Id}, {"item3._id": item13Id}]
			}
		}];

		expect(diff(oldDoc, newDoc)).toEqual(expectedResult);
	});
});
