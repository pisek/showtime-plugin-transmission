/**
 *  showtime-plugin-transmission plugin for Movian
 *
 *  Copyright (C) 2015 Brs & Pisek
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program. If not, see <http://www.gnu.org/licenses/>.
 *  
 */


(function (plugin) {
	
    var PREFIX = plugin.getDescriptor().id;
    var LOGO = plugin.path + "transmission.png";
    var BACKGROUND = plugin.path + "views/img/background.png";
	var BASE_URL = "https://api.tvnplayer.pl/api/?v=3.0&authKey=ba786b315508f0920eca1c34d65534cd&platform=ConnectedTV&terminal=Samsung&format=json";
	var BASE_ASSET_URL = "http://redir.atmcdn.pl/scale/o2/tvn/web-content/m/";
	var USER_AGENT = "Mozilla/5.0 (SmartHub; SMART-TV; U; Linux/SmartTV; Maple2012) AppleWebKit/534.7 (KHTML, like Gecko) SmartTV Safari/534.7";
	var DEFAULT_HEADERS = { "User-Agent": USER_AGENT };
	
	function d(c) {
		print(JSON.stringify(c, null, 4));
	}
	
    function setPageHeader(page, title, image) {
        if (page.metadata) {
            page.metadata.title = title;
            page.metadata.logo = LOGO;
            if (image) {
            	page.metadata.background = image;
            	page.metadata.backgroundAlpha = 0.3;
            } else {
            	page.metadata.background = BACKGROUND;
            	page.metadata.backgroundAlpha = 0.7;
            }
        }
    }
		
    function createTitle(name, episode, season) {
        var title = name;
        if (season > 0 && episode) {
            if (episode < 10) {
                title += " - S" + season + "E0" + episode;
            } else {
                title += " - S" + season + "E" + episode;
            }
        } else if (episode) {
            title += " (odc. " + episode + ")";
        }
        return title;
    }
    
    function createThumbnailUrl(thumbnail) {
        var url = BASE_ASSET_URL + thumbnail.url + "?";
        url+="type="+thumbnail.type;
        url+="&quality=85";
        url+="&srcmode=0";
        url+="&srcx="+thumbnail.srcx;
        url+="&srcy="+thumbnail.srcy;
        url+="&srcw="+thumbnail.srcw;
        url+="&srch="+thumbnail.srch;
        url+="&dstw=300";
        url+="&dsth=300";
        return url;
    }
    
	function toBitrate(quality)
	{
		switch(quality)
		{
			case "Standard":
				return 750000;
			break;
			case "HD":
				return 3000000;
			break;
			case "Bardzo wysoka":
				return 1500000;
			break;
			case "Wysoka":
				return 1000000;
			break;
			case "Średnia":
				return 500000;
			break;
			case "Niska":
				return 300000;
			break;
			case "Bardzo niska":
				return 200000;
			break;
		}
		return 0;
	}
    
    var service = plugin.createService(plugin.getDescriptor().title, PREFIX+":start", "video", true, LOGO);
    
    var settings = plugin.createSettings(plugin.getDescriptor().title, LOGO, plugin.getDescriptor().synopsis);
    
    settings.createMultiOpt('quality', "Jakość wideo (jeśli takowej nie ma - wybrana zostanie najblizsza wybranej)", [
        ['letMeChoose', 'Daj mi wybrac', true],
        ['Standard', 'Standard'],
        ['HD', 'HD'],
        ['Bardzo wysoka', 'Bardzo wysoka'],
        ['Wysoka', 'Wysoka'],
        ['Średnia', 'Średnia'],
        ['Niska', 'Niska'],
        ['Bardzo niska', 'Bardzo niska']
        ], function(v) {
            service.quality = v;
    	}
    );

    plugin.addURI(PREFIX+":start", function (page) {
        page.type = "directory";
        page.loading = true;
        setPageHeader(page, plugin.getDescriptor().title);

        var url = BASE_URL + "&m=mainInfo";
        var mainInfoRespone = showtime.httpReq(url);
		var mainInfo = showtime.JSONDecode(mainInfoRespone.toString());
        var item;
        for (var i = 0; i < mainInfo.categories.length; i++) {
            item = mainInfo.categories[i];
            if (item.type == "catalog") {
                page.appendItem(PREFIX+":" + item.type + ":" + item.id + ":" + item.name, "video", {
                    title: item.name,
                    icon: createThumbnailUrl(item.thumbnail[0])
                });
            }
        }
        page.loading = false;
    });
    
    plugin.addURI(PREFIX+":catalog:(.+):(.+)", function (page, arg, pageTitle) {
		var pageNumber = 1;
		var sort = "alfa";
		var pageSize = 20;
        page.type = "directory";
        setPageHeader(page, pageTitle);
        function loader() {
			page.loading = true;
			var url = BASE_URL + "&m=getItems&isUserLogged=0&type=catalog&id="+arg+"&category=0&limit="+pageSize+"&sort="+sort+"&page="+pageNumber;
			var mainInfoRespone = showtime.httpReq(url);
			var mainInfo = showtime.JSONDecode(mainInfoRespone.toString());
			var allItemsCount = mainInfo.count_items;
			for (var i = 0; i < mainInfo.items.length; i++) {
				var item = mainInfo.items[i];
				page.appendItem(PREFIX+":" + item.type + ":" + item.id + ":" + item.title + ":" + createThumbnailUrl(item.thumbnail[0]), "video", {
					title: item.title,
					icon: createThumbnailUrl(item.thumbnail[0])
				});
			}
			page.loading = false;
			
			return !(pageNumber++ * pageSize > allItemsCount);
		}
		
		if(loader()) {
			page.paginator = loader;
		}
    });
    
    plugin.addURI(PREFIX+":series:(.+):(.+):(.+)", function (page, arg, pageTitle, background) {
        var pageNumber = 1;
		var sort = "newest";
		var pageSize = 20;
        page.type = "directory";
        setPageHeader(page, pageTitle, background);
        function loader() {     
			page.loading = true;
			var url = BASE_URL + "&m=getItems&isUserLogged=0&type=series&limit="+pageSize+"&page="+pageNumber+"&sort="+sort+"&id="+arg;
			var mainInfoRespone = showtime.httpReq(url);
			var mainInfo = showtime.JSONDecode(mainInfoRespone.toString());
			var allItemsCount = mainInfo.count_items;
			for (var i = 0; i < mainInfo.items.length; i++) {
				var item = mainInfo.items[i];
				if (item.type_episode == "preview_prepremiere")	{
					continue;
				}
				var title = createTitle(item.title, item.episode, item.season);
				page.appendItem(PREFIX+":" + item.type + ":" + item.id, "video", {
					title: title,
					description: item.lead,
					duration: item.run_time,
					icon: createThumbnailUrl(item.thumbnail[0])
				});
			}
			page.loading = false;
			
			return !(pageNumber++*pageSize > allItemsCount);
		}
		
		if(loader()) {
			page.paginator = loader;
		}
    });
    
    plugin.addURI(PREFIX+":episode:(.+)", function (page, arg) {
        var url = BASE_URL + "&m=getItem&isUserLogged=0&id="+arg;
        var mainInfoRespone = showtime.httpReq(url);
        var mainInfo = showtime.JSONDecode(mainInfoRespone.toString());
        var item = mainInfo.item;
        var title;
        page.loading = true;
        
        if (service.quality == 'letMeChoose') {
        	page.type = "directory";
        } else {
        	page.type = "video";
        }
        
        if (item.title) {
            title = item.title;
        } else {
            title = createTitle(item.serie_title, item.episode, item.season);
        }
        setPageHeader(page, title, createThumbnailUrl(item.thumbnail[0]));
        
        
        var videos = item.videos.main.video_content;
		if (!videos) {
			page.error("Selected video is not available on this platform.");
			return;
		}
		
       	var desiredBitrate = toBitrate(service.quality);
       	var currentBitrate;
       	var currentQuality;
        for (var i=0; i<videos.length; i++) {
            var video = videos[i];
            
            if (service.quality == 'letMeChoose') {
            	
            	page.appendItem(PREFIX+":video:" + item.id + ":" + video.profile_name, "video", {
					title: video.profile_name,
					description: item.lead,
					duration: item.run_time,
					icon: createThumbnailUrl(item.thumbnail[0])
				});
            	
            } else {
            	
            	if (service.quality == video.profile_name) {	//find desired quality
            		page.redirect(PREFIX+":video:" + item.id + ":" + video.profile_name);
            		break;
            	}
            	
		        var bitrate = toBitrate(video.profile_name);

				//find closest quality from bottom
		        if (bitrate > currentBitrate && bitrate < desiredBitrate) {
					currentBitrate = bitrate;
					currentQuality = video.profile_name;
					continue;
				}
		        
		        //find closest quality from top
		        if (bitrate < currentBitrate && bitrate > desiredBitrate) {
					currentBitrate = bitrate;
					currentQuality = video.profile_name;
					continue;
				}
            	
            }
            
        }
        page.loading = false;
        
        if (service.quality != 'letMeChoose') {
        	if (currentQuality == null) {
		       	page.error("Selected video is not available on this platform.");
				return;
		    } else {
	        	page.redirect(PREFIX+":video:" + item.id + ":" + currentQuality);
		    }
        }
        
    });
    
    plugin.addURI(PREFIX+":video:(.+):(.+)", function (page, arg, quality) {
    	d(PREFIX+":video:"+arg+":"+quality);
        var url = BASE_URL + "&m=getItem&isUserLogged=0&id="+arg;
        d(url);
        var mainInfoRespone = showtime.httpReq(url);
        var mainInfo = showtime.JSONDecode(mainInfoRespone.toString());
        var item = mainInfo.item;
        var title;
        var metadata = {};
        page.loading = true;
        if (item.title) {
            title = item.title;
        } else {
            title = createTitle(item.serie_title, item.episode, item.season);
        }
        setPageHeader(page, title, createThumbnailUrl(item.thumbnail[0]));
        
        if (item.title && item.serie_title) {
			metadata.title = item.serie_title+" - "+item.title;
		} else if (item.serie_title) {
			metadata.title = item.serie_title;
			metadata.season = item.season;
			metadata.episode = item.episode;
		} else {
			metadata.title = item.title;
		}
        
        var videos = item.videos.main.video_content;
		var videoUrl;
		var bitrate = 0;
		if (!videos) {
			page.error("Selected video is not available on this platform.");
			return;
		}
        for (var i=0; i<videos.length; i++) {
            var video = videos[i];
            if (quality == video.profile_name) {
            	videoUrl = video.url;
            	bitrate = toBitrate(video.profile_name);
            	d("Found quality: "+ quality);
            	break;
            }
        }
        if (videoUrl == null) {
        	page.error("Selected video is not available on this platform.");
			return;
        }
        var videoUrl = showtime.httpReq(videoUrl).toString();
        metadata.canonicalUrl = PREFIX+":episode:"+arg;
        metadata.sources = [{ url: videoUrl, bitrate: bitrate }];
        metadata.no_fs_scan = true;
        d(metadata);
        page.loading = false;
        page.source = "videoparams:"+showtime.JSONEncode(metadata);
        page.type = "video";
    });
    
})(this);
