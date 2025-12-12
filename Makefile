STORE=morg-224.myshopify.com
THEME_ID=123456789

dev:
	shopify whoami || shopify auth login --store $(STORE)
	shopify theme dev --store $(STORE) --theme $(THEME_ID)

open:
	shopify theme open --store $(STORE) --theme $(THEME_ID)

push:
	git add .
	git commit -m "Update theme"
	git push origin horizon/dev
