/* jshint globalstrict: true  */
/* global normalizeTheStr: false, sayHello: false, removePrefix: false */
"use strict";

describe("Hello", function () {
    it("says hello to receiver", function () {
        expect(sayHello("Jane")).toBe("Hello, Jane!");
    });
});

describe("other", function () {
    // add the prefix
    it("pure url need to add the prefix", function () {
        var prefix = "imagestore/";
        var url = "20190227/4ec1a18b2c398d67bc78d0869ad4975a.jpg";
        expect(normalizeTheStr(url, prefix)).toBe(prefix + url);
    });

    it("pure url need to add the resize prefix", function () {
        var prefix = "imagestore_100x100/";
        var url = "20190227/4ec1a18b2c398d67bc78d0869ad4975a.jpg";
        expect(normalizeTheStr(url, prefix)).toBe(prefix + url);
    });
    
    it("refuse_sign url need to add the prefix", function () {
        var prefix = "imagestore/";
        var url = "images/case_center/case_work/case_work_process/refuse_sign.png";
        expect(normalizeTheStr(url, prefix)).toBe(url);
    });
    
    it("refuse_seal url need to add the prefix", function () {
        var prefix = "imagestore/";
        var url = "images/case_center/case_work/case_work_process/no_sign.png";
        expect(normalizeTheStr(url, prefix)).toBe(url);
    });
    


    it("pure url: removes the prefix", function () {
        var prefix = "imagestore/";
        var url = "20190227/4ec1a18b2c398d67bc78d0869ad4975a.jpg";
        expect(removePrefix(url, prefix)).toBe(url);
    });
    
    it("pure url: removes the prefix", function () {
        var prefix = "imagestore/";
        var url = "20190227/4ec1a18b2c398d67bc78d0869ad4975a.jpg";
        expect(removePrefix(prefix + url, prefix)).toBe(url);
    });
    
    it("resize url: removes the prefix", function () {
        var prefix = "imagestore_100x100/";
        var url = "20190227/4ec1a18b2c398d67bc78d0869ad4975a.jpg";
        expect(removePrefix(prefix + url, prefix)).toBe(url);
    });
    
    it("refuse_sign url：removes the prefix", function () {
        var prefix = "imagestore/";
        var url = "images/case_center/case_work/case_work_process/refuse_sign.png";
        expect(removePrefix(url, prefix)).toBe(url);
    });
    
    it("refuse_seal url: removes the prefix", function () {
        var prefix = "imagestore/";
        var url = "images/case_center/case_work/case_work_process/no_sign.png";
        expect(removePrefix(url, prefix)).toBe(url);
    });
});