# Production image for the API (Spring Boot). From the root: docker build -t api apps/api
FROM eclipse-temurin:21-jdk AS build
WORKDIR /src
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN ./mvnw -q -B dependency:go-offline
COPY src src
RUN ./mvnw -q -B -DskipTests package && java -Djarmode=tools -jar target/*.jar extract --layers --launcher --destination target/app

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --system --uid 10001 app
COPY --from=build /src/target/app/dependencies/ ./
COPY --from=build /src/target/app/spring-boot-loader/ ./
COPY --from=build /src/target/app/snapshot-dependencies/ ./
COPY --from=build /src/target/app/application/ ./
USER app
EXPOSE 8080
ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
