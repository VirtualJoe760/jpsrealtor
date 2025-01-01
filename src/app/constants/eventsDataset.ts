export interface Event {
    slug: string;
    name: string;
    date: string;
    location: string;
    description: string;
    image: string;
    url: string;
  }
  
  export const majorEvents: Event[] = [
    {
      slug: "coachella",
      name: "Coachella Valley Music and Arts Festival",
      date: "April",
      location: "Empire Polo Club, Indio, CA",
      description: "The Coachella Valley Music and Arts Festival is the pinnacle of global music and cultural events, held each April at the Empire Polo Club in Indio. Renowned for its lineup of legendary performers and groundbreaking artists, Coachella offers an electrifying blend of music, art, and community. From awe-inspiring art installations to unforgettable live performances, this festival transforms the desert into a vibrant hub of creativity and connection. As a real estate professional, I understand the immense value events like Coachella bring to the Coachella Valley. Owning a home here means being part of a region celebrated for its cultural significance and unmatched lifestyle opportunities. Let me help you find a property that connects you to the excitement and allure of this world-famous event.",
      image: "/images/events/coachella.png",
      url: "https://www.coachella.com/",
    },
    {
      slug: "stagecoach",
      name: "Stagecoach Festival",
      date: "April",
      location: "Empire Polo Club, Indio, CA",
      description: "The Stagecoach Festival is the ultimate celebration of country music and Western culture, drawing fans from around the globe to the Empire Polo Club in Indio each April. Featuring performances from the biggest names in country music, this three-day event offers an authentic and unforgettable experience, complete with line dancing, mouthwatering BBQ, and a vibrant community atmosphere. Stagecoach is more than a music festival—it’s a cultural phenomenon that brings the spirit of the American West to life. As a real estate professional, I recognize how events like Stagecoach contribute to the appeal of owning a home in the Coachella Valley. Living here means having the unique opportunity to immerse yourself in a lifestyle rich with music, culture, and community spirit. Let me help you find a property that places you at the heart of this iconic festival experience.",
      image: "/images/events/stagecoach.png",
      url: "https://www.stagecoachfestival.com/",
    },
    {
      slug: "bnp-paribas",
      name: "BNP Paribas Open",
      date: "March",
      location: "Indian Wells Tennis Garden, Indian Wells, CA",
      description: "The BNP Paribas Open, often referred to as the fifth Grand Slam, is a world-renowned tennis tournament held each March at the Indian Wells Tennis Garden. This prestigious event attracts the biggest names in tennis, offering fans an unparalleled experience of thrilling matches, state-of-the-art facilities, and a vibrant atmosphere. Set against the breathtaking desert backdrop of Indian Wells, the tournament combines the excitement of world-class competition with the elegance and luxury that define the Coachella Valley. As a real estate professional, I understand the unique appeal of living near such a prestigious event. Owning a home in Indian Wells or the surrounding area means being part of a community that celebrates excellence, leisure, and sophistication. Let me help you find the perfect property that connects you to the world-class energy and prestige of the BNP Paribas Open.",
      image: "/images/events/bnp-paribas.png",
      url: "https://bnpparibasopen.com/",
    },
    {
      slug: "amex-pga",
      name: "American Express PGA Tour",
      date: "January",
      location: "PGA West, La Quinta, CA",
      description: "The American Express PGA Tour, held each January in the picturesque setting of La Quinta, is a premier golfing event that combines world-class competition with a touch of celebrity glamour. Formerly known as the Bob Hope Classic, this tournament showcases the talents of top professional golfers and offers fans an unforgettable experience amid the stunning Coachella Valley landscape. From the meticulously maintained greens of PGA West to the exciting Pro-Am rounds featuring A-list celebrities, the event embodies the perfect blend of sport and luxury. As a real estate professional, I recognize how events like the American Express PGA Tour enhance the prestige and lifestyle of living in the Coachella Valley. Owning a home here means enjoying unparalleled access to a community where excellence in recreation and elegance converge. Let me help you find a property that puts you at the heart of this iconic golfing tradition.",
      image: "/images/events/amex-pga.png",
      url: "https://www.theamexgolf.com/",
    },
    {
      slug: "ps-film-fest",
      name: "Palm Springs International Film Festival",
      date: "January",
      location: "Various venues in Palm Springs, CA",
      description: "The Palm Springs International Film Festival is a dazzling showcase of cinematic excellence that takes place each January, attracting filmmakers, actors, and film enthusiasts from around the globe. Renowned for its star-studded awards gala and screenings of the year’s most anticipated films, this festival is a cornerstone of cultural life in the Coachella Valley. It offers a unique blend of glamour and artistic innovation, putting Palm Springs on the global stage as a hub for creativity and storytelling. As a real estate professional, I understand how events like the Palm Springs International Film Festival elevate the prestige and allure of owning property in this iconic desert destination. Living here means being part of a vibrant community that celebrates art, culture, and sophistication. Let me help you find a home that places you in the midst of this world-class cultural phenomenon.",
      image: "/images/events/ps-film-fest.png",
      url: "https://www.psfilmfest.org/",
    },
    {
      slug: "la-quinta-arts",
      name: "La Quinta Arts Festival",
      date: "March",
      location: "La Quinta Civic Center Campus, La Quinta, CA",
      description: "The La Quinta Arts Festival is a premier celebration of creativity, showcasing the works of nationally acclaimed artists in a stunning outdoor setting each March. Renowned for its exceptional quality, this festival blends fine art, live music, and gourmet cuisine, creating an enriching experience that attracts art enthusiasts and collectors from across the country. The picturesque backdrop of La Quinta Civic Center Campus enhances the festival's charm, offering attendees a unique opportunity to connect with art and nature. As a real estate professional, I see how events like the La Quinta Arts Festival contribute to the cultural richness and appeal of living in the Coachella Valley. Owning a home here places you at the heart of a community where art and inspiration are woven into the fabric of everyday life. Let me help you find a property that connects you to this unparalleled artistic experience.",
      image: "/images/events/la-quinta-arts.png",
      url: "https://www.lqaf.com/",
    },
    {
      slug: "ironman-70-3",
      name: "Ironman 70.3 Indian Wells-La Quinta",
      date: "December",
      location: "Indian Wells and La Quinta, CA",
      description: "Ironman 70.3 Indian Wells-La Quinta is an iconic endurance event that challenges athletes to conquer a rigorous yet breathtaking triathlon course each December. Combining a swim in pristine waters, a bike ride through the scenic desert, and a run to the finish line, this event showcases the pinnacle of determination and athleticism. Spectators and participants alike are drawn to the beauty and energy of the Coachella Valley during this world-class competition. As a real estate professional, I understand how events like Ironman elevate the allure of living in this region. Owning a home in the Coachella Valley means being part of a community that celebrates health, ambition, and the extraordinary. Let me help you find a property that keeps you close to the action and connected to the inspiring spirit of events like Ironman 70.3.",
      image: "/images/events/ironman-70-3.png",
      url: "https://www.ironman.com/im703-indian-wells-la-quinta",
    },
    {
      slug: "desert-x",
      name: "Desert X",
      date: "February - April",
      location: "Various locations throughout the Coachella Valley",
      description: "Desert X is a groundbreaking biennial art exhibition that transforms the Coachella Valley into an expansive outdoor gallery. From February through April, internationally renowned artists create thought-provoking installations that explore themes of environment, society, and culture. These awe-inspiring works of art invite visitors to experience the desert landscape through a new lens, fostering a deeper connection to the natural world and the creative spirit. As a real estate professional, I see how events like Desert X enrich the value of living in the Coachella Valley. Owning a home here means immersing yourself in a community where art and innovation thrive, offering a unique and culturally rich lifestyle. Let me help you find the perfect property to connect you with the inspiring energy that Desert X brings to the valley.",
      image: "/images/events/desert-x.png",
      url: "https://www.desertx.org/",
    },
    {
      slug: "ps-pride",
      name: "Palm Springs Pride",
      date: "November",
      location: "Downtown Palm Springs, CA",
      description: "Palm Springs Pride is a vibrant and joyous celebration of love, diversity, and inclusivity that transforms Downtown Palm Springs into a kaleidoscope of color and energy every November. This event features a lively parade, live entertainment, and a multitude of cultural showcases that honor the LGBTQ+ community and its allies. With its welcoming atmosphere and dynamic programming, Palm Springs Pride attracts visitors from across the globe, creating a sense of unity and celebration that is unmatched. As a real estate professional and advocate for the inclusive spirit of the Coachella Valley, I recognize the incredible value events like Palm Springs Pride bring to owning a home in this region. Living here means embracing a lifestyle of acceptance and joy, surrounded by a community that thrives on diversity and connection. Let me help you find a property where you can experience the vibrant culture and sense of belonging that make Palm Springs a truly extraordinary place to call home.",

      image: "/images/events/ps-pride.png",
      url: "https://www.pspride.org/",
    },
    {
      slug: "tamale-fest",
      name: "Indio International Tamale Festival",
      date: "December",
      location: "Downtown Indio, CA",
      description: "The Indio International Tamale Festival is a vibrant and flavorful celebration of Latino culture, culinary excellence, and community spirit that transforms Downtown Indio into a festive hub every December. Drawing tens of thousands of visitors from across the region and beyond, the festival is a feast for the senses. The streets come alive with the mouthwatering aroma of freshly prepared tamales, crafted by talented local vendors offering both traditional and innovative flavors. Live performances showcase the rich cultural heritage of the Coachella Valley, from mariachi bands and folkloric dancers to modern entertainers, creating a dynamic and inclusive atmosphere that delights all ages.\n\nAs a real estate professional deeply connected to this community, I see firsthand the magnetic draw of events like the Tamale Festival and how they enhance the value of living in the Coachella Valley. Owning property in this area means you’re not just investing in a home but in a lifestyle filled with rich traditions, world-class events, and a strong sense of belonging. The festival highlights Indio's unique role as a cultural epicenter within the valley, making it an ideal place to live, work, and connect with a diverse and welcoming community. Let me help you find your dream home in the heart of it all, where you can enjoy the warmth, vibrancy, and flavor of this incredible event right in your backyard.",
      image: "/images/events/tamale-fest.png",
      url: "https://www.tamalefestival.net/",
    },
  ];
