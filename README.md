# We.js File plugin

Upload files to server!

## Installation:

```sh
we i we-plugin-file
```

## Features

### Helpers

#### we-image
```hbs
{{we-image imageObject style}}
```

#### we-avatar
```hbs
{{we-avatar id=userId style=style}}
```

#### we-fancybox-galery
```hbs
{{we-fancybox-galery images=images id="aUniqueID" style=style}}
```


### Avaible URLS:

See: https://github.com/wejs/we-plugin-file/blob/master/plugin.js#L73

#### NPM Info:
[![NPM](https://nodei.co/npm/we-plugin-file.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/we-plugin-file/)

## v1.4 plan




post -> banner -> image

post:

banners: {
  type  : 'belongsToMany',
  throgh: 'PostBannerImage',
  inverse: 'inPostBanners',
  model : 'image',
  privateKey: 'postId',
  targetKey: 'id'  
};


image:

inPostBanners: {
  type  : 'belongsToMany',
  throgh: 'PostBannerImage',
  inverse: 'banners',
  model : 'post',
  privateKey: 'imageId',
  targetKey: 'id'  
};

## License

Under [the MIT license](https://github.com/wejs/we/blob/master/LICENSE.md).