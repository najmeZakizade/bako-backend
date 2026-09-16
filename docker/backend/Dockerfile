# مرحله 1: ساخت (Build) با Maven
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app

# کپی پوم برای کشیدن وابستگی‌ها (بهینه‌سازی کش)
COPY pom.xml .
RUN mvn dependency:go-offline

# کپی سورس و ساخت
COPY src ./src
RUN mvn clean package -DskipTests

# مرحله 2: اجرا با JRE سبک
FROM openjdk:17-jdk-slim
WORKDIR /app

# کپی فایل JAR ساخته شده از مرحله قبل
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]