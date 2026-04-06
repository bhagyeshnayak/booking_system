import urllib.request
import json
import re
import urllib.parse
import time

filepath = "populate_movies.py"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

titles_to_fetch = re.findall(r'"title":\s*"([^"]+)"', content)

for title in titles_to_fetch:
    encoded_title = urllib.parse.quote_plus(title)
    url = f"http://www.omdbapi.com/?t={encoded_title}&apikey=trilogy"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            poster = data.get("Poster")
            if poster and poster != "N/A":
                # Find the line in content that matches this title
                pattern = r'(\{"title":\s*"' + re.escape(title) + r'".*?"poster":\s*")[^"]+(".*?\})'
                content = re.sub(pattern, r'\g<1>' + poster + r'\g<2>', content)
                print(f"Replaced poster for {title}")
    except Exception as e:
        print(f"Failed to fetch for {title}: {e}")
    time.sleep(0.1) # Be gentle to the free API

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
print("populate_movies.py updated successfully.")
