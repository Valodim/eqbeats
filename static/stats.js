"use strict";

var clone = function(obj) { // http://my.opera.com/GreyWyvern/blog/show.dml/1725165
    var newObj = (obj instanceof Array) ? [] : {};
    for (var i in obj) {
        if (i == 'clone') continue;
        if (obj[i] && typeof obj[i] == "object") {
            newObj[i] = clone(obj[i]);
        } else newObj[i] = obj[i]
    } return newObj;
};
var daysecs = 60*60*24;
var timescale = d3.scale.linear().domain([today() - daysecs * 60, today() + daysecs ]).range([0, 650]);
var days = 30;
var data = [];
var uniqmode = true;
var statsfirstrun = true;

var charts = [
    { "name": "Views", "id": "views", "classname": "views", "type": "trackView", "height":150, "width": 650, "data": [], "uniqdata": [] },
    { "name": "Plays", "id": "plays", "classname": "plays", "type": "trackPlay", "height":100, "width": 650, "data": [], "uniqdata": [] },
    { "name": "Downloads", "id": "dls", "classname": "dls", "type": "trackDownload", "height":100, "width": 650, "data": [], "uniqdata": [] }
]

var timeranges = [
    { "name": "A month", "days": "30" },
    { "name": "Two months", "days": "61" },
    { "name": "Four months", "days": "122" },
    { "name": "Six months", "days": "183" },
    { "name": "A year", "days": "365" }
]


function now(){ return Math.floor(+(new Date())/1000); }
function day(t){ return t - (t % 86400); }
function today(){ return day(now()); }

function log(l, n){ return Math.log(n)/Math.log(l); }

function initstats(){
    if(statsfirstrun){
        statsfirstrun = false;
        var chartdiv = d3.select("div#charts").style("display", "block");
        chartdiv.append("h3").html("<img src='/static/icons/system-monitor-24.png' alt=''/>Statistics");
        var inner = chartdiv.append("div").classed("double-column", true);
        var settings = inner.append("div").classed("settings", true);
        var span = settings.append("span");
        span.append("input").attr("id", "unique").attr("type", "checkbox")
            .property("checked", uniqmode)
            .on("change", function(){
                uniqmode = this.checked;
                render();
            });
        span.append("label").text("Unique only").attr("for", "unique");
        var span = settings.append("span");
        var select = span.append("select").attr("id", "range")
        select.selectAll("option")
            .data(timeranges).enter()
            .append("option")
            .attr("value", function(d){return d.days;})
            .text(function(d){return d.name;});
        select.property("value", days)
            .on("change", function(){
                days = this.value;
                render();
            });

        var ins = inner.append("div").classed("inspector", true);
        ins.append("span").classed("date", true).html("&nbsp;");
        for(var i = 0; i < charts.length; i++)
            ins.append("span").classed(charts[i].classname, true);

        inner.selectAll("svg.chart").data(charts).enter()
            .append("svg")
            .classed("chart", true)
            .attr("width", function(d){return d.width;})
            .attr("height", function(d){return d.height;})
            .attr("id", function(d){return d.id;})
            .append("text")
            .classed("chartlabel", true)
            .attr("y", 15)
            .attr("x", 5)
            .text(function(d){return d.name;});

        inner.append("h4").html("<img src='/static/icons/chain--arrow.png' alt=''/> Referrers");
        var table = inner.append("table");
        table.classed("referrers", true);
        var colgroup = table.append("colgroup");
        colgroup.append("col");
        colgroup.append("col").classed("value", true);
    }
    var ellipsis = d3.select("#charts").append("div").classed("ellipsis", true);
    var xhr = new XMLHttpRequest();
    xhr.open("GET", window.location.pathname + "/stats?" + now(), true);
    xhr.onreadystatechange = function(){
        if(xhr.readyState == 4){
            data = eval(xhr.responseText);
            render(true);
            d3.select(".ellipsis").remove();
        }
    }
    xhr.send();
}

var dateformat = d3.time.format("%a, %b %e");
function barover(d){
    var thisd = d;
    d3.selectAll("#charts .bar").style("opacity", 1);
    var bars = d3.selectAll("#charts .bar").filter(function(d){return d.key == thisd.key;})
        .style("opacity", 0.5);
    var ins = d3.select("#charts .inspector");
    ins.select(".date").text(dateformat(new Date(d.key * 1000)) + ": ");
    for(var i = 0; i < charts.length; i++){
        var chart = charts[i];
        ins.select("." + chart.classname).text(function(){
            var data = chart.data;
            for(var j = 0; j < data.length; j++){
                if(data[j].key == d.key)
                    return chart.name + ": " + data[j].value + " (" + (chart.uniqdata[j].value || "0") + " uniq.) ";
            }
            return 0;
        });
    }
}

var referrers;
var referring_domains;

function render(refilter){
    if(refilter){
        var cf = crossfilter(data);
        var entriesByTime = cf.dimension(function(d){return d.timestamp;});
        var daily = entriesByTime.group(function(t){ return t - (t % daysecs); });
        var entriesByType = cf.dimension(function(d){return d.type;});
        for(var i = 0; i < charts.length; i++){
            entriesByType.filter(charts[i].type);
            charts[i].data = clone(daily.all());
        }
        entriesByType.filter("trackView");
        var entriesByReferringDomain = cf.dimension(function(d){return d.referrer ? d.referrer.replace(/^https?:\/\/(www\.)?([^\/]*).*$/, "$2") : '';});
        var entriesGroupByReferringDomain = entriesByReferringDomain.group();
        referring_domains = clone(entriesGroupByReferringDomain.top(6));

        referrers = Object();
        var entriesByReferrer = cf.dimension(function(d){return d.referrer || '';});
        var entriesGroupByReferrer = entriesByReferrer.group();
        for(var i = 0; i < referring_domains.length; i++){
            var domain = referring_domains[i].key;
            entriesByReferringDomain.filter(domain);
            referrers[domain] = clone(entriesGroupByReferrer.top(5));
        }
        cf = crossfilter(uniq(data));
        entriesByTime = cf.dimension(function(d){return d.timestamp;});
        daily = entriesByTime.group(function(t){ return t - (t % daysecs); });
        entriesByType = cf.dimension(function(d){return d.type;});
    for(var i = 0; i < charts.length; i++){
            entriesByType.filter(charts[i].type);
            charts[i].uniqdata = clone(daily.all());
        }
    }
    for(var i = 0; i < charts.length; i++){
        var chart = charts[i];

        // grab in-range days only
        var chartdata_ = uniqmode?chart.uniqdata:chart.data;
        var chartdata = Array();
        for(var j = 0; j < chartdata_.length; j++){
            if(chartdata_[j].key >= today() - (days - 1) * daysecs)
                chartdata.push(chartdata_[j]);
        }

        // scale
        timescale = timescale.domain([today() - daysecs * (days - 1), today() + daysecs]);
        var ceiling = 20;
        for(var j = 0; j < chartdata.length; j++)
            while(chartdata[j].value >= ceiling - 1){
                var power = Math.pow(10, Math.floor(log(10, ceiling)));
                if(Math.round(ceiling / power) < 2){ ceiling = 2 * power; }
                else if(Math.round(ceiling / power) < 4){ ceiling = 4 * power; }
                else if(Math.round(ceiling / power) < 6){ ceiling = 6 * power; }
                else{ ceiling = 10 * power; }
            }
        var yscale = d3.scale.linear().domain([0, ceiling]).range([0, chart.height]).nice();
        var prevyscale = chart.yscale || yscale;
        chart.yscale = yscale;

        // making bars
        var update = d3.select("#" + chart.id).selectAll("." + chart.classname)
            .data(chartdata, function(d){ return d.key; });
        update.enter()
            .append("rect")
            .attr("height", 1).attr("y", chart.height)
            .attr("width", timescale(daysecs) - timescale(0) + 1)
            .attr("x", function(d){ return Math.floor(timescale(d.key)) - 1; })
            .classed(chart.classname, true).classed("bar", true);
        update.transition()
            .attr("height", function(d){ return yscale(d.value); })
            .attr("y", function(d){ return chart.height - yscale(d.value); })
            .attr("width", timescale(daysecs) - timescale(0) + 1)
            .attr("x", function(d){ return Math.floor(timescale(d.key)) - 1; })
        update.exit().transition()
            .attr("height", 0)
            .attr("y", chart.height)
            .attr("width", timescale(daysecs) - timescale(0) + 1)
            .attr("x", function(d){ return Math.floor(timescale(d.key)) - 1; })
        update.on("mouseover", barover);

        // ticks
        var ticks = yscale.ticks(3).slice(1, -1);
        var update = d3.select("#" + chart.id).selectAll(".ytick").data(ticks, function(d){return d});
        update.enter().append("rect")
            .classed("tick", true).classed("ytick", true)
            .attr("x", 0)
            .attr("width", chart.width)
            .attr("height", 1)
            .attr("y", function(d){ return chart.height - prevyscale(d); })
            .style("opacity", 0);
        update.transition()
            .attr("y", function(d){ return chart.height - yscale(d); })
            .style("opacity", 0.5);
        update.exit().transition()
            .attr("y", function(d){ return chart.height - yscale(d); })
            .style("opacity", 0.2)
            .transition().style("opacity", 0).remove();
        var labels = d3.select("#" + chart.id).selectAll(".ylabel").data(ticks, function(d){return d;});
        // tick labels
        labels.enter().append("text")
            .classed("ylabel", true)
            .attr("x", 5)
            .attr("y", function(d){ return chart.height - prevyscale(d) - 5; })
            .text(function(d){return d;})
            .style("opacity", 0);
        labels.transition()
            .attr("y", function(d){ return chart.height - yscale(d) - 5; })
            .style("opacity", 0.5);
        labels.exit().transition()
            .attr("y", function(d){ return chart.height - yscale(d) - 5; })
            .style("opacity", 0.2)
            .transition().style("opacity", 0).remove();

    }

    // referrers
    var update = d3.select(".referrers").selectAll("tr").data(referring_domains);
    var tr = update.enter().append("tr");
    var td = tr.append("td").each(function(d){
        if(d.key==""){
            this.appendChild(document.createTextNode("No address (IM, Email, Bookmarks...)"));
        } else {
            var a = document.createElement("A");
            a['href'] = "http://" + d.key;
            a.appendChild(document.createTextNode(d.key))
            this.appendChild(a);
            var ul = document.createElement("UL");
            d3.select(ul).selectAll("li").data(referrers[d.key]).enter()
                .append("li").append("a")
                .attr("href", function(d){return d.key})
                .each(function(d){this.appendChild(document.createTextNode(d.key))});
            this.appendChild(ul);
            var thistd = this;
            a.onclick = function(e){
                e.preventDefault();
                if(thistd.className != "open"){
                    d3.select(thistd).classed("open", true);
                } else {
                    d3.select(thistd).classed("open", false);
                }
            }
        }
    })
    tr.append("td").classed("value", true).html(function(d){ return d.value; });
    tr.filter(function(d){ return d.value <= 0; }).remove();
    tr.select("ul").selectAll("li").filter(function(d){ return d.value <= 0; }).remove();
    update.exit().remove();

}

function uniq(data){
    var out = Array();
    var seen = Array();
    for(var i=0; i < data.length; i++){
        var row = data[i];
        switch(row.unique){
            case 1:
                out.push(row);
                break;
            case -1:
            var hash = row.type + row.addr + day(row.timestamp);
            if(seen.indexOf(hash) == -1){
                seen.push(hash);
                out.push(row);
            }
        }
    }
    return out;
}

function noop(){}

if(window.location.hash == "#charts"){
    var oldonload = window.onload || noop;
    window.onload = function(){ this(); initstats(); }.bind(oldonload);
}
