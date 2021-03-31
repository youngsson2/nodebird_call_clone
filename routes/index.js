"use strict";

const express = require("express");
const axios = require("axios");

const router = express.Router();
const URL = "http://localhost:8082/v2";

router.get("/", (req, res) => {
  res.render("main", {
    key: process.env.CLIENT_SECRET,
  });
});

router.get("/test", async (req, res, next) => {
  try {
    // 세션에 토큰이 없으면
    if (!req.session.jwt) {
      // axios.post(주소, { 데이터 })를 하면 해당 주소에 POST 요청을 보내면서 요청 본문에 데이터를 실어보냄
      const tokenResult = await axios.post("http://localhost:8002/v2/token", {
        clientSecret: process.env.CLIENT_SECRET,
      });
      // 토큰 정상 발급 성공
      if (tokenResult.data && tokenResult.data.code === 200) {
        req.session.jwt = tokenResult.data.token; // 세션에 토큰 저장
        // 토큰 발급 실패
      } else {
        return res.json(tokenResult.data); // 발급 실패 사유 응답
      }
      // axios.get(주소, { headers: { 헤더 } })를 하면 해당 주소에 헤더와 함께 GET 요청을 보냄
      const tokenTest = await axios.get("http://localhost:8002/v2/test", {
        headers: { authorization: req.session.jwt },
      });
      return res.json(tokenTest.data);
    }
  } catch (err) {
    console.error(err);
    // 토큰 만료시
    if (err.response.code === 419) {
      return res.json(err.response.data); // 만료 메시지 보냄
    }
    return res.json(err);
  }
});

const request = async (req, api) => {
  try {
    if (!req.session.jwt) {
      const tokenResult = await axios.post(`${URL}/token`, {
        clientSecret: process.env.CLIENT_SECRET,
      });
      if (tokenResult.data && tokenResult.data.code === 200) {
        req.session.jwt = tokenResult.data.token;
      }
      return await axios.get(`${URL}/${api}`, {
        headers: { authorization: req.session.jwt },
      });
    }
  } catch (err) {
    console.error(err);
    if (err.response.status < 500) {
      // 419 처럼 의도된 에러면
      return err.response;
    }
    throw err;
  }
};

router.get("/mypost", async (req, res, next) => {
  try {
    if (!req.session.jwt) {
      const tokenResult = await axios.post("http://localhost:8002/v2/token", {
        clientSecret: process.env.CLIENT_SECRET,
      });
      if (tokenResult.data && tokenResult.data.code === 200) {
        req.session.jwt = tokenResult.data.token;
      }
      const result = await axios.get("http://localhost:8002/v2/posts/my", {
        headers: { authorization: req.session.jwt },
      });
      res.json(result.data);
    }
  } catch (err) {
    console.error(err);
    if (err.response.code === 419) {
      return res.json(err.response.data);
    }
    return res.json(err);
  }
});

router.get("/search/:hashtag", async (req, res, next) => {
  try {
    const result = await request(
      req,
      `/post/hashtag/${encodeURIComponent(req.params.hashtag)}`
    );
    res.json(result.data);
  } catch (err) {
    console.error(err);
    next(err);
  }
});

module.exports = router;
